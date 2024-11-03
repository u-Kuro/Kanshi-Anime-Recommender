package com.example.kanshi.localHTTPServer;

public interface LocalServerListener {
    void onStart(String url);
    void onError(String promise);
}
