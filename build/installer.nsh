; Extra steps for the Mi Estudio installer (electron-builder NSIS).

!macro customUnInstall
  ; The miestudio:// links that the app registers when it starts (notification buttons)
  DeleteRegKey HKCU "Software\Classes\miestudio"
  ; "Start with Windows": Electron saves it under the app id
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "com.miestudio.app"
!macroend
