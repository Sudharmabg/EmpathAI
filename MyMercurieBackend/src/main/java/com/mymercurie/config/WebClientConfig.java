package com.mymercurie.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        ConnectionProvider provider = ConnectionProvider.builder("custom")
                .maxConnections(100)
                .pendingAcquireTimeout(Duration.ofSeconds(45))
                .build();

        HttpClient httpClient = HttpClient.create(provider)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 10000) // 10s connect timeout
                .responseTimeout(Duration.ofSeconds(60))             // 60s response timeout
                .doOnConnected(conn -> conn
                        .addHandlerLast(new ReadTimeoutHandler(60, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(60, TimeUnit.SECONDS)));

        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient));
    }

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);  // 5 seconds connect timeout
        factory.setReadTimeout(15000);    // 15 seconds read timeout
        return new RestTemplate(factory);
    }
}
