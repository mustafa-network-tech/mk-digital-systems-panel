param([switch]$Apply)

[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$script:OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$dotlessI = [char]0x0131
$emailPrompt = "Supabase Kullan${dotlessI}c${dotlessI} e-postas${dotlessI}"
$passwordPrompt = "Supabase Kullan${dotlessI}c${dotlessI} parolas${dotlessI}"
$email = Read-Host $emailPrompt
$securePassword = Read-Host $passwordPrompt -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $env:PROJECT_IMPORT_EMAIL = $email
  $env:PROJECT_IMPORT_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $arguments = @("scripts/import-project-inventory.mjs")
  if ($Apply) { $arguments += "--apply" }
  & node $arguments
  exit $LASTEXITCODE
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:PROJECT_IMPORT_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:PROJECT_IMPORT_PASSWORD -ErrorAction SilentlyContinue
  $securePassword = $null
  $email = $null
}
