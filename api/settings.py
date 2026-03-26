import sys
import ctypes

class SettingsApi:

    # Ändert die Fenstergröße
    def resize(self, width, height):
        self.win.resize(int(width), int(height))

    # Gibt das Betriebssystem zurück
    def get_platform(self):
        return sys.platform

    # Gibt den Skalierungsfaktor des Bildschirms zurück (für hochauflösende Displays)
    def get_scale_factor(self):
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
            hdc = ctypes.windll.user32.GetDC(0)
            dpi = ctypes.windll.gdi32.GetDeviceCaps(hdc, 88)  # LOGPIXELSX
            ctypes.windll.user32.ReleaseDC(0, hdc)
            return dpi / 96.0
        except:
            return 1.0