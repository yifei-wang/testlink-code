<?php
/**
 * CKEditor Image Upload Handler for TestLink
 * Standalone version - no TestLink dependencies
 */

header('Content-Type: application/json');

$response = [
    'uploaded' => 0,
    'error' => ['message' => '']
];

// Check if file was uploaded
if (!isset($_FILES['upload']) || $_FILES['upload']['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = isset($_FILES['upload']) ? 'Upload error code: ' . $_FILES['upload']['error'] : 'No file uploaded';
    $response['error']['message'] = $errorMsg;
    echo json_encode($response);
    exit;
}

$file = $_FILES['upload'];
$fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

// Validate file type (only images allowed)
$allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
if (!in_array($fileExt, $allowedTypes)) {
    $errorMsg = "Invalid file type: $fileExt. Only allowed: " . implode(', ', $allowedTypes);
    $response['error']['message'] = $errorMsg;
    echo json_encode($response);
    exit;
}

// Validate file size (default 5MB limit)
$maxSize = 5 * 1024 * 1024; // 5MB
if ($file['size'] > $maxSize) {
    $errorMsg = "File too large: {$file['size']} bytes. Maximum size is 5MB.";
    $response['error']['message'] = $errorMsg;
    echo json_encode($response);
    exit;
}

// Determine upload directory - use separate directory for paste uploads
$uploadDir = '/var/testlink/upload_area/ckeditor_images/paste/';

// Check parent directory exists
$parentDir = '/var/testlink/upload_area/';
if (!is_dir($parentDir)) {
    $errorMsg = "Parent directory does not exist: $parentDir";
    $response['error']['message'] = $errorMsg;
    echo json_encode($response);
    exit;
}

// Create directory if it doesn't exist
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0777, true)) {
        $error = error_get_last();
        $errorMsg = "Failed to create upload directory. Check parent directory permissions. Error: " . ($error ? $error['message'] : 'unknown');
        $response['error']['message'] = $errorMsg;
        echo json_encode($response);
        exit;
    }
}

// Check if directory is writable
if (!is_writable($uploadDir)) {
    $errorMsg = "Upload directory is not writable: $uploadDir.";
    $response['error']['message'] = $errorMsg;
    echo json_encode($response);
    exit;
}

// Generate unique filename
$baseName = 'ckeditor_' . time() . '_' . substr(md5(uniqid()), 0, 8);
$fileName = $baseName . '.' . $fileExt;

// Generate web-accessible path - absolute path from web root
// The upload_area is accessible via Alias /upload_area
$webPath = '/upload_area/ckeditor_images/paste/' . $fileName;

// Move uploaded file
$destination = $uploadDir . $fileName;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    $errorMsg = "Failed to save uploaded file. Destination: $destination. Check directory ownership and permissions.";
    $response['error']['message'] = $errorMsg;
    echo json_encode($response);
    exit;
}

// Set proper file permissions
chmod($destination, 0644);

// Success response
$response = [
    'uploaded' => 1,
    'fileName' => $fileName,
    'url' => $webPath
];

echo json_encode($response);
