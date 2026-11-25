<?php
/**
 * Brilliant Drivers — Form Handler (PHP 8.x for Cloudways Custom PHP App)
 *
 * Handles both the Registration Form (form_type=register) and Contact Form
 * (form_type=contact). Zero database or disk storage: submissions are emailed
 * directly to info@brilliantdrivers.ca via PHP mail() (which Cloudways routes
 * through Elastic Email or your configured SMTP add-on).
 */
declare(strict_types=1);

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

const RECIPIENT_EMAIL = 'info@brilliantdrivers.ca';
const FROM_EMAIL      = 'noreply@brilliantdrivers.ca';
const SITE_NAME       = 'Brilliant Drivers';

function isAjax(): bool {
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    return str_contains($accept, 'application/json');
}

function respond(bool $ok, string $message, int $status = 200): never {
    if (isAjax()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($ok) {
        header('Location: /thank-you/', true, 303);
        exit;
    }

    http_response_code($status);
    header('Content-Type: text/html; charset=UTF-8');
    $safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    echo "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>Submission Error</title>"
        . "<body style=\"font-family:system-ui,sans-serif;max-width:600px;margin:60px auto;padding:0 20px;\">"
        . "<h1>Could not submit form</h1><p>{$safe}</p>"
        . "<p><a href=\"javascript:history.back()\">Go back</a> or call us at <strong>416-276-2399</strong>.</p>"
        . "</body></html>";
    exit;
}

function cleanLine(?string $value): string {
    $v = trim((string) $value);
    return preg_replace("/[\r\n]+/", ' ', $v) ?? '';
}

function cleanBlock(?string $value): string {
    $v = trim((string) $value);
    return str_replace("\0", '', $v);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(false, 'Method not allowed.', 405);
}

// Honeypot check (bots fill hidden `website` field)
if (!empty($_POST['website'])) {
    respond(true, 'Thank you! Your submission has been received.');
}

// Timing check (reject instant automated posts < 1.5s when _ts is provided)
$ts = isset($_POST['_ts']) ? (int) $_POST['_ts'] : 0;
if ($ts > 0) {
    $elapsedMs = (int) (microtime(true) * 1000) - $ts;
    if ($elapsedMs < 1500) {
        respond(false, 'Please wait a moment before submitting the form.', 429);
    }
}

$formType = cleanLine($_POST['form_type'] ?? '');

if ($formType === 'contact') {
    $name    = cleanLine($_POST['name'] ?? '');
    $phone   = cleanLine($_POST['phone'] ?? '');
    $email   = cleanLine($_POST['email'] ?? '');
    $message = cleanBlock($_POST['message'] ?? '');

    if ($name === '' || $phone === '' || $email === '' || $message === '') {
        respond(false, 'Please fill in all required fields.', 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(false, 'Please enter a valid email address.', 422);
    }

    $subject = '[' . SITE_NAME . '] Contact Message from ' . $name;
    $body    = "New contact inquiry from brilliantdrivers.ca\n"
             . "=========================================\n\n"
             . "Name:    {$name}\n"
             . "Phone:   {$phone}\n"
             . "Email:   {$email}\n\n"
             . "Message:\n{$message}\n";

    $replyTo = $email;
    $successMessage = 'Thank you for reaching out! We will contact you shortly.';
} elseif ($formType === 'register') {
    $firstName  = cleanLine($_POST['first_name'] ?? '');
    $middleName = cleanLine($_POST['middle_name'] ?? '');
    $lastName   = cleanLine($_POST['last_name'] ?? '');
    $phone      = cleanLine($_POST['phone'] ?? '');
    $email      = cleanLine($_POST['email'] ?? '');
    $dob        = cleanLine($_POST['dob'] ?? '');
    $gender     = cleanLine($_POST['gender'] ?? '');
    $address    = cleanLine($_POST['address'] ?? '');
    $city       = cleanLine($_POST['city'] ?? '');
    $province   = cleanLine($_POST['province'] ?? '');
    $postalCode = cleanLine($_POST['postal_code'] ?? '');
    $licNum     = cleanLine($_POST['licence_number'] ?? '');
    $licClass   = cleanLine($_POST['licence_class'] ?? '');
    $licExpiry  = cleanLine($_POST['licence_expiry'] ?? '');
    $package    = cleanLine($_POST['package'] ?? '');
    $promoCode  = cleanLine($_POST['promo_code'] ?? 'None');
    $message    = cleanBlock($_POST['message'] ?? '');
    $acceptance = cleanLine($_POST['acceptance'] ?? '');
    $signature  = cleanLine($_POST['signature'] ?? '');

    if (
        $firstName === '' || $lastName === '' || $phone === '' || $email === '' ||
        $dob === '' || $gender === '' || $address === '' || $city === '' ||
        $province === '' || $postalCode === '' || $licClass === '' ||
        $package === '' || $acceptance === '' || $signature === ''
    ) {
        respond(false, 'Please complete all required registration fields and accept the terms.', 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(false, 'Please enter a valid email address.', 422);
    }

    $packageLabels = [
        'bde-regular'          => 'BDE Course (Online) Popular Package - $574.99 + Tax',
        'bde-advanced'         => 'BDE Course (Online) Plus Package - $674.99 + Tax',
        'bde-enhanced'         => 'BDE Course (Online) Premium Package - $774.99 + Tax',
        'road-test-in-city'    => 'Road Test Package (Brampton, Mississauga) - $200',
        'road-test-out-of-city'=> 'Road Test Package (Outside Brampton, Mississauga) - $250',
        'lesson-45'            => 'Individual Car Lesson - $40 / 45 Minute',
        'lesson-60'            => 'Individual Car Lesson - $45 / 60 Minute',
    ];
    $packageDisplay = $packageLabels[$package] ?? $package;
    $fullName = trim("{$firstName} {$middleName} {$lastName}");
    $fullName = preg_replace('/\s+/', ' ', $fullName) ?? $fullName;

    $subject = '[' . SITE_NAME . '] New Registration: ' . $fullName;
    $body    = "New student registration from brilliantdrivers.ca\n"
             . "==============================================\n\n"
             . "Student Name:   {$fullName}\n"
             . "Phone:          {$phone}\n"
             . "Email:          {$email}\n"
             . "Date of Birth:  {$dob}\n"
             . "Gender:         {$gender}\n\n"
             . "Address:        {$address}\n"
             . "City/Province:  {$city}, {$province}\n"
             . "Postal Code:    {$postalCode}\n\n"
             . "Licence Number: " . ($licNum !== '' ? $licNum : 'Not provided') . "\n"
             . "Licence Class:  {$licClass}\n"
             . "Licence Expiry: " . ($licExpiry !== '' ? $licExpiry : 'Not provided') . "\n\n"
             . "Package:        {$packageDisplay}\n"
             . "Promo Code:     {$promoCode}\n\n"
             . "Message / Preferred Schedule:\n" . ($message !== '' ? $message : '(None)') . "\n\n"
             . "Terms Accepted: {$acceptance}\n"
             . "Signature:      {$signature}\n";

    $replyTo = $email;
    $successMessage = 'Thank you for registering! Our office will contact you shortly to confirm your schedule.';
} else {
    respond(false, 'Invalid form submission.', 400);
}

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: ' . SITE_NAME . ' <' . FROM_EMAIL . '>',
    'Reply-To: ' . $replyTo,
    'X-Mailer: PHP/' . PHP_VERSION,
];

$sent = @mail(RECIPIENT_EMAIL, $subject, $body, implode("\r\n", $headers));
if (!$sent) {
    respond(false, 'We could not deliver your message via email right now.', 500);
}

respond(true, $successMessage);
