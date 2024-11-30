# Set the maximum batch size in bytes (2GB)
$maxBatchSize = 2GB
$currentBatchSize = 0
$batchNumber = 1

# Get the list of untracked files
$files = git ls-files --others --exclude-standard

foreach ($file in $files) {
    # Get the file size
    $fileSize = (Get-Item $file).Length

    # Check if adding this file would exceed the batch limit
    if ($currentBatchSize + $fileSize -gt $maxBatchSize) {
        # Commit and push the current batch
        git commit -m "Batch $batchNumber commit"
        git push

        # Reset batch size and increment batch number
        $currentBatchSize = 0
        $batchNumber++
    }

    # Stage the file and add its size to the batch
    git add $file
    $currentBatchSize += $fileSize
}

# Commit and push any remaining files
if ($currentBatchSize -gt 0) {
    git commit -m "Batch $batchNumber commit"
    git push
}
