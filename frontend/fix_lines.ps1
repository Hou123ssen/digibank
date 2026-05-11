$f = 'src\pages\dashboard\UserDashboardPage.jsx'
$lines = Get-Content $f
# Remove lines 526 to 575 (0-indexed: 525 to 574)
$clean = @($lines[0..524]) + @($lines[575..($lines.Length-1)])
$clean | Set-Content $f
