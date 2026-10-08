<?php
/**
 * HirePlus Technology — contact form handler
 *
 * Receives the popup form (index.html → assets/js/contact.js) and emails it to
 * the HR inbox. Needs a PHP host (cPanel / shared hosting / VPS) with mail() working.
 */

// ---------------------------------------------------------------- CONFIG ----
const MAIL_TO        = 'hr@hireplustech.com';                   // who receives the enquiries
const MAIL_FROM      = 'no-reply@hireplustech.com';             // MUST be an address on your own domain
const MAIL_FROM_NAME = 'HirePlus Website';
const SITE_NAME      = 'HirePlus Technology';
const RATE_LIMIT     = 5;     // max submissions per IP …
const RATE_WINDOW    = 3600;  // … per this many seconds
// For local testing only: set env HIREPLUS_DRY_RUN=1 to write the email to mail-dry-run.log instead of sending.
// ---------------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'message' => 'Method not allowed.']);
}

// Honeypot: real visitors never see or fill this field. Pretend success to bots.
if (!empty($_POST['website'] ?? '')) {
    respond(200, ['ok' => true]);
}

/** Trim, strip control characters, cap length. */
function clean($v, int $max = 200): string {
    $v = is_string($v) ? $v : '';
    $v = preg_replace('/[^\P{C}\n\r\t]/u', '', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
}
/** Single-line values only (anything that ends up in a mail header). */
function oneLine(string $v): string {
    return trim(preg_replace('/[\r\n]+/', ' ', $v) ?? '');
}

$f = [
    'first_name' => oneLine(clean($_POST['first_name'] ?? '', 60)),
    'last_name'  => oneLine(clean($_POST['last_name']  ?? '', 60)),
    'country'    => oneLine(clean($_POST['country']    ?? '', 80)),
    'state'      => oneLine(clean($_POST['state']      ?? '', 80)),
    'city'       => oneLine(clean($_POST['city']       ?? '', 80)),
    'zipcode'    => oneLine(clean($_POST['zipcode']    ?? '', 20)),
    'phone'      => oneLine(clean($_POST['phone']      ?? '', 30)),
    'email'      => oneLine(clean($_POST['email']      ?? '', 120)),
    'service'    => oneLine(clean($_POST['service']    ?? '', 100)),
    'message'    => clean($_POST['message'] ?? '', 4000),
];

// ------------------------------------------------------------ VALIDATION ----
$errors = [];
foreach (['first_name' => 'first name', 'last_name' => 'last name', 'country' => 'country',
          'phone' => 'phone number', 'email' => 'email address', 'service' => 'service',
          'message' => 'message'] as $key => $label) {
    if ($f[$key] === '') $errors[$key] = "Please enter your $label.";
}
if (!isset($errors['email']) && !filter_var($f['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}
if (!isset($errors['phone'])) {
    $digits = preg_replace('/\D/', '', $f['phone']) ?? '';
    if (strlen($digits) < 7 || strlen($digits) > 15 || !preg_match('/^[0-9+()\-.\s]+$/', $f['phone'])) {
        $errors['phone'] = 'Please enter a valid phone number.';
    }
}
if (!isset($errors['message']) && mb_strlen($f['message']) < 10) {
    $errors['message'] = 'Please tell us a little more (at least 10 characters).';
}
if ($errors) {
    respond(422, ['ok' => false, 'errors' => $errors]);
}

// ------------------------------------------------------------- RATE LIMIT ---
$ip   = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$file = sys_get_temp_dir() . '/hireplus_rl_' . md5($ip) . '.json';
$now  = time();
$hits = [];
if (is_readable($file)) {
    $hits = json_decode((string) file_get_contents($file), true) ?: [];
    $hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - RATE_WINDOW));
}
if (count($hits) >= RATE_LIMIT) {
    respond(429, ['ok' => false, 'message' => 'Too many submissions. Please try again later or email ' . MAIL_TO . '.']);
}

// ------------------------------------------------------------ BUILD EMAIL --
$fullName = $f['first_name'] . ' ' . $f['last_name'];
$location = implode(', ', array_filter([$f['city'], $f['state'], $f['country']]));
if ($f['zipcode'] !== '') $location .= ' — ' . $f['zipcode'];

$subject = 'New enquiry: ' . $f['service'] . ' — ' . $fullName;
$body  = "New enquiry from the " . SITE_NAME . " website\n";
$body .= str_repeat('=', 48) . "\n\n";
$body .= "Name:      $fullName\n";
$body .= "Email:     {$f['email']}\n";
$body .= "Phone:     {$f['phone']}\n";
$body .= "Service:   {$f['service']}\n";
$body .= "Location:  $location\n";
$body .= "  Country: {$f['country']}\n";
$body .= "  State:   " . ($f['state']   ?: '-') . "\n";
$body .= "  City:    " . ($f['city']    ?: '-') . "\n";
$body .= "  Zipcode: " . ($f['zipcode'] ?: '-') . "\n\n";
$body .= "Message:\n" . str_repeat('-', 48) . "\n{$f['message']}\n" . str_repeat('-', 48) . "\n\n";
$body .= 'Submitted: ' . gmdate('Y-m-d H:i') . " UTC\n";
$body .= "IP: $ip\n";
$body .= "Reply directly to this email to respond to {$f['first_name']}.\n";

$encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$encFrom    = '=?UTF-8?B?' . base64_encode(MAIL_FROM_NAME) . '?=';
$encReply   = '=?UTF-8?B?' . base64_encode($fullName) . '?=';

$headers = [
    "From: $encFrom <" . MAIL_FROM . '>',
    "Reply-To: $encReply <{$f['email']}>",
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: HirePlus-Website',
];

// -------------------------------------------------------------------- SEND --
if (getenv('HIREPLUS_DRY_RUN') === '1') {
    file_put_contents(__DIR__ . '/mail-dry-run.log',
        "TO: " . MAIL_TO . "\nSUBJECT: $subject\n" . implode("\n", $headers) . "\n\n$body\n\n", FILE_APPEND);
    $sent = true;
} else {
    // -f sets the envelope sender, which many hosts require for delivery
    $sent = @mail(MAIL_TO, $encSubject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);
}

if (!$sent) {
    error_log('HirePlus contact form: mail() failed for enquiry from ' . $f['email']);
    respond(500, ['ok' => false, 'message' => 'Sorry, we could not send your message just now. Please email ' . MAIL_TO . ' directly.']);
}

$hits[] = $now;
@file_put_contents($file, json_encode($hits), LOCK_EX);
respond(200, ['ok' => true]);
