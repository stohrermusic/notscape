; Inno Setup script for Notscape — builds dist\Notscape-Setup-<ver>.exe
; Build the app dir first:  npm run pack   (electron-builder --dir -> dist\win-unpacked)
; Then compile this:        iscc installer\notscape.iss

#define MyAppName "Notscape"
#define MyAppVersion "0.6.0"
#define MyAppPublisher "Matt Stohrer"
#define MyAppURL "https://github.com/stohrermusic/notscape"
#define MyAppExeName "Notscape.exe"

[Setup]
AppId={{B7E4C2A1-9D3F-4E8B-A6C5-1F2D3E4A5B6C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\Notscape
DefaultGroupName=Notscape
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=Notscape-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#MyAppExeName}
#if FileExists("..\build\icon.ico")
SetupIconFile=..\build\icon.ico
#endif

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\dist\win-unpacked\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\Notscape"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall Notscape"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Notscape"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,Notscape}"; Flags: nowait postinstall skipifsilent
