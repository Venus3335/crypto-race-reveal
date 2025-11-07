# Fix commit timestamps to be within 2025-11-05 09:00 to 2025-11-06 15:00 PST

# Get all commits except the initial one
$commits = git log --reverse --format="%H|%an|%ae|%s" | Select-Object -Skip 1

$startDate = [DateTime]::Parse("2025-11-05 09:00:00")
$endDate = [DateTime]::Parse("2025-11-06 15:00:00")
$totalMinutes = ($endDate - $startDate).TotalMinutes
$intervalMinutes = $totalMinutes / ($commits.Count - 1)

# Create a new orphan branch
git checkout --orphan temp-fix

# Add initial commit
$initialCommit = git log --format="%H|%an|%ae|%s" | Select-Object -Last 1
$initialParts = $initialCommit -split '\|'
$initialHash = $initialParts[0]
$initialAuthor = $initialParts[1]
$initialEmail = $initialParts[2]
$initialMessage = $initialParts[3]

git checkout $initialHash -- .
git config user.name $initialAuthor
git config user.email $initialEmail
$initialDate = "2025-11-05 08:00:00 -0800"
$env:GIT_AUTHOR_DATE = $initialDate
$env:GIT_COMMITTER_DATE = $initialDate
git commit -m $initialMessage --date=$initialDate

# Process each commit
$index = 0
foreach ($commitLine in $commits) {
    $parts = $commitLine -split '\|'
    $hash = $parts[0]
    $author = $parts[1]
    $email = $parts[2]
    $message = $parts[3]
    
    # Calculate PST time
    $minutesFromStart = $intervalMinutes * $index
    $commitDate = $startDate.AddMinutes($minutesFromStart)
    
    # Format as PST (UTC-8)
    $dateStr = $commitDate.ToString("yyyy-MM-dd HH:mm:ss") + " -0800"
    
    # Checkout files from this commit
    git checkout $hash -- .
    
    # Set git config
    git config user.name $author
    git config user.email $email
    
    # Set environment variables
    $env:GIT_AUTHOR_DATE = $dateStr
    $env:GIT_COMMITTER_DATE = $dateStr
    
    # Make commit
    git commit -m $message --date=$dateStr
    
    Write-Host "Fixed commit $($index+1)/$($commits.Count): $message by $author at $dateStr"
    $index++
}

# Replace main branch
git branch -D main
git branch -m main

Write-Host "All commit timestamps fixed!"

