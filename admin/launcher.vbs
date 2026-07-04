Dim WshShell, fso, strDir
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run Chr(34) & strDir & "\start.bat" & Chr(34), 0, False
