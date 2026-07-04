Dim WshShell, fso, strRoot, strDesktop, oShortcut
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strRoot    = fso.GetParentFolderName(WScript.ScriptFullName)
strDesktop = WshShell.SpecialFolders("Desktop")

Set oShortcut = WshShell.CreateShortcut(strDesktop & "\KakaoTalk Web Manager.lnk")
oShortcut.TargetPath      = "wscript.exe"
oShortcut.Arguments       = """" & strRoot & "\admin\launcher.vbs"""
oShortcut.WorkingDirectory = strRoot & "\admin"
oShortcut.IconLocation    = strRoot & "\admin\icon.ico"
oShortcut.Description     = "KakaoTalk Web Manager"
oShortcut.Save()

MsgBox "Shortcut created on Desktop!", 64, "Done"
