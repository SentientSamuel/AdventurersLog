$source = ".\bestiary-icons"
$dest   = ".\assets\icons\bestiary"

New-Item -ItemType Directory -Force -Path $dest

Copy-Item "$source\bosses.png"       "$dest\bosses.png"
Copy-Item "$source\slayer.png"       "$dest\slayer.png"
Copy-Item "$source\dragons.png"      "$dest\dragons.png"
Copy-Item "$source\demons.png"       "$dest\demons.png"
Copy-Item "$source\giants.png"       "$dest\giants.png"
Copy-Item "$source\undead.png"       "$dest\undead.png"
Copy-Item "$source\wilderness.png"   "$dest\wilderness.png"
Copy-Item "$source\gods.png"         "$dest\gods.png"
Copy-Item "$source\kalphites.png"    "$dest\kalphites.png"
Copy-Item "$source\sea-creatures.png" "$dest\sea-creatures.png"
Copy-Item "$source\vampyres.png"     "$dest\vampyres.png"

Write-Host "Done! Images copied to assets\icons\bestiary\" -ForegroundColor Green