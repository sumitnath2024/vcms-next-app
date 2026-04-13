package com.vivekanandachildsmission.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 🔥 THE MAGIC FIX: This forces the Android OS to physically restrict 
        // the WebView from drawing underneath the Status Bar and Navigation Bar.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}