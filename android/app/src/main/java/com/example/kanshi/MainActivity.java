package com.example.kanshi;

import static com.example.kanshi.Utils.*;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.PowerManager;
import android.provider.DocumentsContract;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

import androidx.core.content.FileProvider;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends AppCompatActivity {

    public final int appID = 55;
    public boolean webviewIsLoaded = false;
    public SharedPreferences prefs;
    private SharedPreferences.Editor prefsEdit;

    private ValueCallback<Uri[]> mUploadMessage;
    private String exportPath;
    private MediaWebView webView;

    private PowerManager.WakeLock wakeLock;
    public boolean shouldGoBack;
    public Toast currentToast;
    public AlertDialog currentDialog;

    // Activity Results
    final ActivityResultLauncher<Intent> allowApplicationUpdate =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    new ActivityResultCallback<>() {
                        @Override
                        public void onActivityResult(ActivityResult activityResult) {
                            webView.post(() -> webView.loadUrl("javascript:window.updateAppAlert();"));
                        }
                    }
            );
    final ActivityResultLauncher<Intent> chooseImportFile =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    new ActivityResultCallback<>() {
                        @Override
                        public void onActivityResult(ActivityResult activityResult) {
                            int resultCode = activityResult.getResultCode();
                            Intent intent = activityResult.getData();
                            try {
                                Uri[] result = null;
                                if (null == mUploadMessage || resultCode != RESULT_OK) {
                                    result = new Uri[]{Uri.parse("")};
                                } else {
                                    assert intent != null;
                                    String dataString = intent.getDataString();
                                    if (dataString != null) {
                                        result = new Uri[]{Uri.parse(dataString)};
                                    }
                                }
                                mUploadMessage.onReceiveValue(result);
                                mUploadMessage = null;
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    }
            );
    final ActivityResultLauncher<Intent> chooseExportFile =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    new ActivityResultCallback<>() {
                        @Override
                        public void onActivityResult(ActivityResult activityResult) {
                            int resultCode = activityResult.getResultCode();
                            Intent intent = activityResult.getData();
                            try {
                                if (resultCode != RESULT_OK) {
                                    return;
                                }
                                assert intent != null;
                                Uri uri = intent.getData();
                                Uri docUri = DocumentsContract.buildDocumentUriUsingTree(uri,
                                        DocumentsContract.getTreeDocumentId(uri));
                                exportPath = getThisPath(docUri);
                                showToast(Toast.makeText(getApplicationContext(), "Export folder is selected, you may now use the export feature.", Toast.LENGTH_LONG));
                                prefsEdit.putString("savedExportPath", exportPath).apply();
                                webView.loadUrl("javascript:window.setExportPathAvailability(true)");
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    }
            );
    @RequiresApi(api = Build.VERSION_CODES.N)
    @SuppressLint({"SetJavaScriptEnabled", "WrongViewCast"})
    @Override
    protected void onCreate(final Bundle savedInstanceState) {
        // Shared Preference
        prefs = MainActivity.this.getSharedPreferences("com.example.kanshi", Context.MODE_PRIVATE);
        prefsEdit = prefs.edit();
        // Saved Data
        exportPath = prefs.getString("savedExportPath", "");
        // Create WebView App Instance

        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !webviewIsLoaded);
        // Show status bar
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        // Keep Awake on Lock Screen
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "KeepAwake:");
        wakeLock.acquire(10*60*1000L);
        // Add WebView on Layout
        webView = findViewById(R.id.webView);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(Color.BLACK);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }
        // Set WebView Settings
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setSaveFormData(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setLoadsImagesAutomatically(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setBlockNetworkLoads(false);
        webSettings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            webSettings.setOffscreenPreRaster(true);
        }
        // prevent the default behavior of WebView for long press events
        webView.setOnLongClickListener(v -> true);
        // Set WebView Configs
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setScrollBarStyle(View.SCROLLBARS_OUTSIDE_OVERLAY);
        webView.setLongClickable(true);
        webView.setKeepScreenOn(true);
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        // Add Bridge to Webview
        webView.addJavascriptInterface(new JSBridge(),"JSBridge");
        webView.setWebViewClient(new WebViewClient(){
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                webviewIsLoaded = false;
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView,true);
                CookieManager.getInstance().acceptCookie();
                CookieManager.getInstance().flush();
                super.onPageFinished(view, url);
                webviewIsLoaded = true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (webView.getUrl().startsWith("https://u-kuro.github.io/Kanshi.Anime-Recommendation") && !webviewIsLoaded){
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Something failed to load")
                        .setMessage("Do you want to switch to the local app?")
                        .setPositiveButton("OK", (dialogInterface, i) -> webView.loadUrl("file:///android_asset/www/index.html"))
                        .setNegativeButton("CANCEL", null));
                }
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // In App Browsing
                String url = request.getUrl().toString();
                Intent intent = new Intent(MainActivity.this, WebViewActivity.class);
                intent.putExtra("url", url);
                startActivity(intent);
                overridePendingTransition(R.anim.right_to_center, R.anim.center_to_left);
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            private View mCustomView;
            private CustomViewCallback mCustomViewCallback;
            private int mOriginalOrientation;
            private int mOriginalSystemUiVisibility;
            // Import
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                try {
                    if (mUploadMessage != null) {
                        mUploadMessage.onReceiveValue(null);
                    }
                    mUploadMessage = filePathCallback;
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT)
                            .addCategory(Intent.CATEGORY_OPENABLE)
                            .setType("application/json");// set MIME type to filter
                    chooseImportFile.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Please select your backup file.", Toast.LENGTH_LONG));
                    return true;
                } catch (Exception e){
                    e.printStackTrace();
                    return true;
                }
            }
            // Fullscreen
            @Override
            public Bitmap getDefaultVideoPoster(){
                if (mCustomView == null) {
                    return null;
                }
                return BitmapFactory.decodeResource(getApplicationContext().getResources(), 2130837573);
            }
            @Override
            public void onHideCustomView() {
                ((FrameLayout)getWindow().getDecorView()).removeView(this.mCustomView);
                this.mCustomView = null;
                getWindow().getDecorView().setSystemUiVisibility(this.mOriginalSystemUiVisibility);
                setRequestedOrientation(this.mOriginalOrientation);
                this.mCustomViewCallback.onCustomViewHidden();
                this.mCustomViewCallback = null;
            }
            @Override
            public void onShowCustomView(View paramView, CustomViewCallback paramCustomViewCallback) {
                if (this.mCustomView != null) {
                    onHideCustomView();
                    return;
                }
                this.mCustomView = paramView;
                this.mOriginalSystemUiVisibility = getWindow().getDecorView().getSystemUiVisibility();
                this.mOriginalOrientation = getRequestedOrientation();
                this.mCustomViewCallback = paramCustomViewCallback;
                ((FrameLayout)getWindow().getDecorView()).addView(this.mCustomView, new FrameLayout.LayoutParams(-1, -1));
                getWindow().getDecorView().setSystemUiVisibility(3846 | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            }
            // Console Logs for Debugging
            @RequiresApi(api = Build.VERSION_CODES.R)
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                String message = consoleMessage.message();
                Log.d("WebConsole",message);
                return true;
            }
        });
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        isAppConnectionAvailable(isConnected -> webView.post(() -> {
            if (isConnected) {
                webView.loadUrl("https://u-kuro.github.io/Kanshi.Anime-Recommendation/");
            } else {
                webView.loadUrl("file:///android_asset/www/index.html");
                showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Connection unreachable")
                        .setMessage("Switched to local app and cached data.")
                        .setPositiveButton("OK", null)
                );
            }
            // Only works after first page load
            webSettings.setBuiltInZoomControls(false);
            webSettings.setDisplayZoomControls(false);
            webSettings.setSupportZoom(false);
        }),3000);
    }

    // Get Path From MainActivity Context
    public String getThisPath(Uri docUri){
        return getPath(this, docUri);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        webView.setKeepScreenOn(true);
        webView.resumeTimers();
        webView.setVisibility(View.VISIBLE);
        webView.onWindowSystemUiVisibilityChanged(View.VISIBLE);
        webView.onWindowVisibilityChanged(View.VISIBLE);
        MainActivity.this.setVisible(true);
        MainActivity.this.requestVisibleBehind(true);
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.post(() -> webView.loadUrl("javascript:" +
            "window.returnedAppIsVisible(false);" // Should Be Runned First
        ));
    }

    @Override
    protected void onResume() {
        if (webviewIsLoaded) {
            overridePendingTransition(R.anim.left_to_center, R.anim.center_to_right);
        }
        super.onResume();
        webView.post(() -> webView.loadUrl("javascript:" +
            "window.returnedAppIsVisible(true);" + // Should Be Runned First
            "window.checkEntries();"
        ));
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        wakeLock.release();
    }

    // Native and Webview Connection
    @SuppressWarnings("unused")
    class JSBridge {
        @SuppressWarnings({"unused"})
        BufferedWriter writer;
        File tempFile;
        String directoryPath;
        @RequiresApi(api = Build.VERSION_CODES.R)
        @JavascriptInterface
        public void exportJSON(String chunk, int status, String fileName){
            if(status==0) {
                if (!Environment.isExternalStorageManager()) {
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Permission for external storage")
                            .setMessage("Allow permission for Kanshi. to use the export feature.")
                            .setPositiveButton("OK", (dialogInterface, i) -> {
                                Uri uri = Uri.parse("package:${BuildConfig.APPLICATION_ID}");
                                showToast(Toast.makeText(getApplicationContext(), "Allow permission for Kanshi. in here to use the export feature.", Toast.LENGTH_LONG));
                                startActivity(new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, uri));
                            })
                            .setNegativeButton("CANCEL", null));
                } else {
                    if (new File(exportPath).isDirectory()) {
                        directoryPath = exportPath + File.separator;
                        File directory = new File(directoryPath);
                        boolean dirIsCreated;
                        if (!directory.exists()) {
                            dirIsCreated = directory.mkdirs();
                        } else {
                            dirIsCreated = true;
                        }
                        if (directory.isDirectory() && dirIsCreated) {
                            try {
                                tempFile = new File(directoryPath + "tmp.json");
                                boolean tempFileIsDeleted;
                                if (tempFile.exists()) {
                                    tempFileIsDeleted = tempFile.delete();
                                    //noinspection ResultOfMethodCallIgnored
                                    tempFile.createNewFile();
                                } else {
                                    tempFileIsDeleted = true;
                                    //noinspection ResultOfMethodCallIgnored
                                    tempFile.createNewFile();
                                }
                                if (tempFileIsDeleted) {
                                    writer = new BufferedWriter(new FileWriter(tempFile, true));
                                } else {
                                    showToast(Toast.makeText(getApplicationContext(), "Error: Temporary data can't be re-written, please delete tmp.json first in the selected directory.", Toast.LENGTH_LONG));
                                }
                            } catch (Exception e) {
                                if(writer!=null){
                                    try {
                                        writer.close();
                                    } catch (Exception e2) {
                                        showToast(Toast.makeText(getApplicationContext(), "Error: An exception occurred initializing the tmp.json file.", Toast.LENGTH_LONG));
                                        e.printStackTrace();
                                    }
                                }
                                showToast(Toast.makeText(getApplicationContext(), "Error: An exception occurred initializing the tmp.json file.", Toast.LENGTH_LONG));
                                e.printStackTrace();
                            }
                        } else if (!dirIsCreated) {
                            showToast(Toast.makeText(getApplicationContext(), "Error: Folder directory can't be found, please create it first.", Toast.LENGTH_LONG));
                        }
                    } else if (!Objects.equals(exportPath, "") && !new File(exportPath).isDirectory()) {
                        String[] tempExportPath = exportPath.split("/");
                        String tempPathName = tempExportPath.length > 1 ?
                                tempExportPath[tempExportPath.length - 2] + "/" +
                                        tempExportPath[tempExportPath.length - 1]
                                : tempExportPath[tempExportPath.length - 1];
                        showDialog(new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Export folder is missing")
                                .setMessage("Folder directory [" + tempPathName
                                        + "] is missing, please choose another folder for exporting.")
                                .setPositiveButton("Choose a Folder", (dialogInterface, x) -> {
                                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
                                            .addCategory(Intent.CATEGORY_DEFAULT);
                                    chooseExportFile.launch(i);
                                    showToast(Toast.makeText(getApplicationContext(), "Select or create a directory.", Toast.LENGTH_LONG));
                                })
                                .setNegativeButton("CANCEL", null));
                    } else {
                        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
                                .addCategory(Intent.CATEGORY_DEFAULT);
                        chooseExportFile.launch(i);
                        showToast(Toast.makeText(getApplicationContext(), "Select or create a directory.", Toast.LENGTH_LONG));
                    }
                }
            } else if(status==1&&writer!=null) {
                try{
                    writer.write(chunk);
                } catch (Exception e) {
                    try {
                        writer.close();
                    } catch (Exception e2) {
                        showToast(Toast.makeText(getApplicationContext(), "Error: An exception occurred while writing to tmp.json file.", Toast.LENGTH_LONG));
                        e.printStackTrace();
                    }
                    showToast(Toast.makeText(getApplicationContext(), "Error: An exception occurred while writing to tmp.json file.", Toast.LENGTH_LONG));
                    e.printStackTrace();
                }
            } else if(status==2&&writer!=null){
                try{
                    writer.write(chunk);
                    writer.close();
                    boolean fileIsDeleted;
                    File file = new File(directoryPath + fileName);
                    if (file.exists()) {
                        fileIsDeleted = file.delete();
                        //noinspection ResultOfMethodCallIgnored
                        file.createNewFile();
                    } else {
                        //noinspection ResultOfMethodCallIgnored
                        file.createNewFile();
                        fileIsDeleted = true;
                    }
                    if(fileIsDeleted){
                        boolean renamed = tempFile.renameTo(file);
                        if(!renamed){
                            showToast(Toast.makeText(getApplicationContext(), "Error: Data file can't be renamed, your original backup is in tmp.json.", Toast.LENGTH_LONG));
                        }
                    } else {
                        showToast(Toast.makeText(getApplicationContext(), "Error: Data can't be re-written, please delete it first in the selected directory.", Toast.LENGTH_LONG));
                    }
                } catch (Exception e) {
                    try {
                        writer.close();
                    } catch (Exception e2) {
                        showToast(Toast.makeText(getApplicationContext(), "Error: An exception occurred in finalizing the exported file, your back-up was saved in tmp.json but is not guaranteed to work.", Toast.LENGTH_LONG));
                        e.printStackTrace();
                    }
                    showToast(Toast.makeText(getApplicationContext(), "Error: An exception occurred in finalizing the exported file, your back-up was saved in tmp.json but is not guaranteed to work.", Toast.LENGTH_LONG));
                    e.printStackTrace();
                }
            }
        }
        @JavascriptInterface
        public void copyToClipBoard(String text) {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = ClipData.newPlainText("Copied Text", text);
            clipboard.setPrimaryClip(clip);
        }
        @JavascriptInterface
        public void setShouldGoBack(boolean _shouldGoBack) { shouldGoBack = _shouldGoBack; }
        @JavascriptInterface
        public void chooseExportFolder() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (!Environment.isExternalStorageManager()) {
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Permission for external storage")
                            .setMessage("Allow permission for Kanshi. to use the export feature.")
                            .setPositiveButton("OK", (dialogInterface, i) -> {
                                Uri uri = Uri.fromParts("package", getPackageName(), null);
                                showToast(Toast.makeText(getApplicationContext(), "Allow permission for Kanshi. in here to use the export feature.", Toast.LENGTH_LONG));
                                startActivity(new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, uri));
                            })
                            .setNegativeButton("CANCEL", null));
                } else {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
                            .addCategory(Intent.CATEGORY_DEFAULT);
                    chooseExportFile.launch(i);
                    showToast(Toast.makeText(getApplicationContext(), "Select or create a directory.", Toast.LENGTH_LONG));
                }
            }
        }
        public boolean connectionChecking = false;
        @RequiresApi(api = Build.VERSION_CODES.N)
        @JavascriptInterface
        public void switchApp() {
            try {
                webView.post(() -> {
                    if (webView.getUrl().startsWith("https://u-kuro.github.io/Kanshi.Anime-Recommendation")) {
                        showDialog(new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Switch app mode")
                                .setMessage("Do you want to switch to the local app?")
                                .setPositiveButton("OK", (dialogInterface, i) -> webView.loadUrl("file:///android_asset/www/index.html"))
                                .setNegativeButton("CANCEL", null));
                    } else {
                        showToast(Toast.makeText(getApplicationContext(), "Connecting...", Toast.LENGTH_LONG));
                        if (connectionChecking) return;
                        connectionChecking = true;
                        isAppConnectionAvailable(isConnected -> webView.post(() -> {
                            hideToast();
                            connectionChecking = false;
                            if (isConnected) {
                                showDialog(new AlertDialog.Builder(MainActivity.this)
                                        .setTitle("Switch app mode")
                                        .setMessage("Do you want to switch to the online app?")
                                        .setPositiveButton("OK", (dialogInterface, i) -> webView.loadUrl("https://u-kuro.github.io/Kanshi.Anime-Recommendation/"))
                                        .setNegativeButton("CANCEL", null));
                            } else {
                                showDialog(new AlertDialog.Builder(MainActivity.this)
                                        .setTitle("Switch app mode")
                                        .setMessage("Connection unreachable, can't switch at this moment.")
                                        .setPositiveButton("OK", null));
                            }
                        }), 3000);
                    }
                });
            } catch (Exception exception) {
                connectionChecking = false;
                showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Switch app mode")
                        .setMessage("Something went wrong, app switch is currently not working.")
                        .setPositiveButton("OK", null));
            }
        }
        @RequiresApi(api = Build.VERSION_CODES.N)
        @JavascriptInterface
        public void isOnline(boolean isOnline) {
            try {
                isAppConnectionAvailable(isConnected -> webView.post(() -> {
                    if (isConnected && isOnline && webView.getUrl().startsWith("file:///android_asset/www/index.html")) {
                        showDialog(new AlertDialog.Builder(MainActivity.this)
                            .setTitle("Reconnected successfully")
                            .setMessage("Do you want to switch to the online app?")
                            .setPositiveButton("OK", (dialogInterface, i) -> webView.loadUrl("https://u-kuro.github.io/Kanshi.Anime-Recommendation/"))
                            .setNegativeButton("CANCEL", null));
                    }
                }),10000);
            } catch (Exception ignored) {}
        }
        @JavascriptInterface
        public void checkAppID(int _appID, boolean manualCheck) {
            if (_appID > appID) {
                webView.post(() -> webView.loadUrl("javascript:window.updateAppAlert();"));
            } else if (manualCheck) {
                webView.post(() -> webView.loadUrl("javascript:window.appIsUpToDate();"));
            }
        }
        @JavascriptInterface
        public void refreshWeb(){
            webView.post(() -> {
                webView.clearCache(true);
                webView.reload();
            });
        }
        @RequiresApi(api = Build.VERSION_CODES.O)
        @JavascriptInterface
        public void downloadUpdate() {
            boolean hasPermission = getPackageManager().canRequestPackageInstalls();
            if (hasPermission) {
                _downloadUpdate();
            } else {
                showDialog(new AlertDialog.Builder(MainActivity.this)
                .setTitle("Permission for in-app installation")
                .setMessage("Allow permission for Kanshi. to update within the app.")
                .setPositiveButton("OK", (dialogInterface, i) -> {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.fromParts("package", getPackageName(), null));
                    showToast(Toast.makeText(getApplicationContext(), "Allow permission for Kanshi. in here to update within the app.", Toast.LENGTH_LONG));
                    allowApplicationUpdate.launch(intent);
                })
                .setNegativeButton("CANCEL", (dialogInterface, i) -> {
                    showToast(Toast.makeText(getApplicationContext(), "You may still manually install the update.", Toast.LENGTH_LONG));
                    webView.post(() -> webView.loadUrl("javascript:window.updateAppAlert();"));
                }));
            }
        }
    }

    public void _downloadUpdate() {
        webView.post(() -> webView.clearCache(true));
        String fileUrl = "https://github.com/u-Kuro/Kanshi.Anime-Recommendation/raw/main/Kanshi.apk";
        String fileName = "Kanshi.apk";
        DownloadUtils.downloadFile(MainActivity.this, fileUrl, fileName, new DownloadUtils.DownloadCallback() {
            @RequiresApi(api = Build.VERSION_CODES.O)
            @Override
            public void onDownloadCompleted(String apkFilePath) {
                boolean hasPermission = getPackageManager().canRequestPackageInstalls();
                if (hasPermission) {
                    showDialog(new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Update ready to install")
                        .setMessage("Do you want to continue the installation?")
                        .setPositiveButton("OK", (dialogInterface, i) -> {
                            File apkFile = new File(apkFilePath);
                            if (apkFile.exists()) {
                                Uri apkUri = FileProvider.getUriForFile(MainActivity.this, "com.example.kanshi.provider", apkFile);
                                Intent intent = new Intent(Intent.ACTION_VIEW);
                                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                List<ResolveInfo> resolveInfoList = getPackageManager().queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
                                if (!resolveInfoList.isEmpty()) {
                                    startActivity(intent);
                                } else {
                                    Toast.makeText(MainActivity.this, "No application available to open the APK file", Toast.LENGTH_LONG).show();
                                }
                            } else {
                                Toast.makeText(MainActivity.this, "File is not found", Toast.LENGTH_LONG).show();
                            }
                        })
                        .setNegativeButton("CANCEL", null).setCancelable(false));
                }
            }
            @Override
            public void onDownloadFailed() {
                showDialog(new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Download failed")
                    .setMessage("Do you want to re-download?")
                    .setPositiveButton("OK", (dialogInterface, i) -> _downloadUpdate())
                    .setNegativeButton("CANCEL", null));
            }
        });
    }

    @Override
    public void onBackPressed() {
        if(webView.getUrl().startsWith("file:///android_asset/www/index.html") || webView.getUrl().startsWith("https://u-kuro.github.io/Kanshi.Anime-Recommendation")){
            if(!shouldGoBack){
                webView.post(() -> webView.loadUrl("javascript:window.backPressed();"));
            } else {
                moveTaskToBack(true);
            }
        } else {
            if (webView.canGoBack()) {
                webView.goBack();
            } else {
                super.onBackPressed();
            }
        }
    }

    public void showDialog(AlertDialog.Builder alertDialog) {
        if (currentDialog != null && currentDialog.isShowing()) {
            currentDialog.dismiss();
        }
        currentDialog = alertDialog.show();
        webView.post(() -> webView.loadUrl("javascript:document?.querySelectorAll?.('input:focus')?.forEach(input => input?.blur?.());"));
    }
    public void showToast(Toast toast) {
        if (currentToast != null) {
            currentToast.cancel();
        }
        currentToast = toast;
        currentToast.show();
    }
    public void hideToast() {
        if (currentToast != null) {
            currentToast.cancel();
        }
        currentToast = null;
    }
    @RequiresApi(api = Build.VERSION_CODES.N)
    private void isAppConnectionAvailable(ConnectivityCallback callback, int timeout) {
        ConnectivityManager connectivityManager =
                (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = connectivityManager.getActiveNetwork();
        if (network == null) {
            callback.onConnectionResult(false);
            return;
        }
        CompletableFuture.supplyAsync(() -> checkAppConnection(timeout))
                .thenAccept(callback::onConnectionResult);
    }
    private boolean checkAppConnection(int timeout) {
        try {
            URL url = new URL("https://u-kuro.github.io/Kanshi.Anime-Recommendation/");
            HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
            urlConnection.setRequestMethod("HEAD");
            Thread connectionThread = new Thread(() -> {
                try {
                    urlConnection.getResponseCode();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            });
            connectionThread.start();
            connectionThread.join(timeout);
            if (connectionThread.isAlive()) {
                connectionThread.interrupt();
                return false;
            } else {
                return true;
            }
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
        }
        return false;
    }
    interface ConnectivityCallback {
        void onConnectionResult(boolean isConnected);
    }
}

