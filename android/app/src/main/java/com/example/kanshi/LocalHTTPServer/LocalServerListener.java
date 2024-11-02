package com.example.kanshi.LocalHTTPServer;

public interface LocalServerListener {
    void onStart(String url);
    void onFinish(String promise);
    void onError(String promise);
}
