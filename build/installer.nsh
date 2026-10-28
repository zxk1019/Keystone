; Extra steps for the Keystone installer (electron-builder NSIS).

!macro customUnInstall
  ; An update also uninstalls the old version first: then the registrations stay, so
  ; "Start with Windows" keeps working even if the update installs when the app quits
  ${ifNot} ${isUpdated}
    ; The miestudio:// links that the app registers when it starts (notification buttons)
    DeleteRegKey HKCU "Software\Classes\miestudio"
    ; "Start with Windows": Electron saves it under the app id
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.miestudio.app"
  ${endIf}
!macroend
