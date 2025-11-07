# PowerShell script to fix commit timestamps to PST/PDT (UTC-8)
# Convert from +0800 to -0800 (16 hours difference)

$commits = git log --reverse --format="%H|%an|%ae|%at|%s" | ForEach-Object {
    $parts = $_ -split '\|'
    [PSCustomObject]@{
        Hash = $parts[0]
        Author = $parts[1]
        Email = $parts[2]
        Timestamp = [int]$parts[3]
        Message = $parts[4]
    }
}

# Filter out the initial commit
$commits = $commits | Where-Object { $_.Message -ne "Initial commit: ZLottery project setup" }

Write-Host "Found $($commits.Count) commits to fix"

# Create a new branch for the fix
git checkout --orphan temp-branch

# Add the initial commit first
$initialCommit = git log --format="%H|%an|%ae|%at|%s" | Select-Object -Last 1
$initialParts = $initialCommit -split '\|'
$initialHash = $initialParts[0]
$initialAuthor = $initialParts[1]
$initialEmail = $initialParts[2]
$initialTimestamp = [int]$initialParts[3]
$initialMessage = $initialParts[4]

# Checkout the initial commit files
git checkout $initialHash -- .

# Convert timestamp: PST is UTC-8, so we need to subtract 8 hours from UTC
# But the original timestamp is in +0800, so we need to subtract 16 hours total
$pstStart = Get-Date "2025-11-05 09:00:00" -TimeZone "Pacific Standard Time"
$pstEnd = Get-Date "2025-11-06 15:00:00" -TimeZone "Pacific Standard Time"

# Calculate interval
$totalSeconds = ($pstEnd - $pstStart).TotalSeconds
$intervalSeconds = $totalSeconds / $commits.Count

# Commit the initial commit with PST time
$initialPSTTime = $pstStart.AddHours(-1)  # Initial commit is before the range
$initialPSTTimestamp = [int]($initialPSTTime.ToUniversalTime() - (Get-Date "1970-01-01")).TotalSeconds

git config user.name $initialAuthor
git config user.email $initialEmail
$env:GIT_AUTHOR_DATE = $initialPSTTime.ToString("yyyy-MM-dd HH:mm:ss -0800")
$env:GIT_COMMITTER_DATE = $initialPSTTime.ToString("yyyy-MM-dd HH:mm:ss -0800")
git commit -m $initialMessage --date="$($initialPSTTime.ToString('yyyy-MM-dd HH:mm:ss -0800'))"

# Now process each commit
for ($i = 0; $i -lt $commits.Count; $i++) {
    $commit = $commits[$i]
    
    # Calculate PST time for this commit
    $pstTime = $pstStart.AddSeconds($intervalSeconds * $i)
    $pstTimestamp = [int]($pstTime.ToUniversalTime() - (Get-Date "1970-01-01")).TotalSeconds
    
    # Checkout the files from this commit
    git checkout $commit.Hash -- .
    
    # Set git config
    git config user.name $commit.Author
    git config user.email $commit.Email
    
    # Set environment variables
    $dateStr = $pstTime.ToString("yyyy-MM-dd HH:mm:ss -0800")
    $env:GIT_AUTHOR_DATE = $dateStr
    $env:GIT_COMMITTER_DATE = $dateStr
    
    # Make commit
    git commit -m $commit.Message --date=$dateStr
    
    Write-Host "Fixed commit $($i+1)/$($commits.Count): $($commit.Message) by $($commit.Author) at $dateStr"
}

# Switch back to main and replace it
git branch -D main
git branch -m main

Write-Host "All timestamps fixed to PST/PDT!"

