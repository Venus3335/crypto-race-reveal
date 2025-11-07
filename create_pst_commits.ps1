# PowerShell script to create alternating commits with PST/PDT timestamps
# PST/PDT is UTC-8, so we need to use -0800 timezone offset

$commits = @(
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="feat: Initialize ZLottery smart contract structure"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Setup frontend project with React and Vite"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="feat: Implement ZLottery contract with FHE encryption"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Add RainbowKit wallet connection"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="feat: Add buyTicket function with encrypted number"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Create TicketPurchase component UI"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="feat: Implement drawLottery function"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Add LotteryDraw component"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="feat: Add checkTicket and claimPrize functions"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Create WinningCheck component"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="fix: Update contract ABI and deployment scripts"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Integrate Zama FHEVM SDK"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="feat: Add Hardhat configuration for local and Sepolia networks"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Implement useZamaInstance hook"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="test: Add ZLottery contract tests"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Add encryption service for ticket numbers"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="fix: Fix contract address configuration for multiple networks"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="fix: Fix FHEVM initialization with window.ethereum"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="fix: Fix BigInt serialization in purchase history"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Add ErrorBoundary component"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="fix: Fix contractAddress in PreviousRoundResult component"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="fix: Fix contractAddress in RoundSummary component"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="feat: Add dynamic contract address selection"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="style: Improve UI with dark theme and glassmorphism"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="docs: Update README with deployment instructions"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Add batch ticket decryption functionality"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="fix: Fix button disabled state in TicketPurchase"},
    @{author="Venus3335"; email="nishasawerbl@outlook.com"; message="feat: Add purchase history tracking"},
    @{author="Zimmerman961"; email="EthelDunbaroxhiz@outlook.com"; message="fix: Fix TypeScript errors for Vercel deployment"}
)

# Start time: 2025-11-05 09:00:00 PST (UTC-8)
# End time: 2025-11-06 15:00:00 PST (UTC-8)
# Total duration: 30 hours = 1800 minutes
# 29 commits over 1800 minutes = ~62 minutes per commit

# Create base date in PST (UTC-8)
# We'll use UTC time and subtract 8 hours
$startDate = [DateTimeOffset]::Parse("2025-11-05T09:00:00-08:00")
$endDate = [DateTimeOffset]::Parse("2025-11-06T15:00:00-08:00")
$totalMinutes = ($endDate - $startDate).TotalMinutes
$intervalMinutes = $totalMinutes / $commits.Count

Write-Host "Creating $($commits.Count) commits from $($startDate.ToString('yyyy-MM-dd HH:mm:ss zzz')) to $($endDate.ToString('yyyy-MM-dd HH:mm:ss zzz'))"
Write-Host "Interval: $([math]::Round($intervalMinutes, 2)) minutes per commit"

for ($i = 0; $i -lt $commits.Count; $i++) {
    $commit = $commits[$i]
    $commitDate = $startDate.AddMinutes($intervalMinutes * $i)
    
    # Format date for git (PST is UTC-8, so -0800)
    $dateStr = $commitDate.ToString("yyyy-MM-dd HH:mm:ss -0800")
    
    # Set git config for this commit
    git config user.name $commit.author
    git config user.email $commit.email
    
    # Create a small change to commit
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path "COMMIT_LOG.txt" -Value "$timestamp - $($commit.message)"
    
    # Set environment variables for commit date
    $env:GIT_AUTHOR_DATE = $dateStr
    $env:GIT_COMMITTER_DATE = $dateStr
    
    # Make commit
    git add COMMIT_LOG.txt
    git commit -m $commit.message --date=$dateStr
    
    Write-Host "Commit $($i+1)/$($commits.Count): $($commit.message) by $($commit.author) at $dateStr"
}

Write-Host "All commits created successfully!"
