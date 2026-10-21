
source.enable = function (conf) {
    log("Otakudesu plugin enabled");
};

source.getHome = function (continuationToken) {
    var response = http.GET(
        "https://otakudesu.blog/",
        {},
        false
    );

    if (!response.isOk) {
        throw new Error("Gagal membuka Otakudesu");
    }

    var html = response.body;
    var pattern = /<a[^>]+href="(https?:\/\/otakudesu\.blog\/anime\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*class="jdlflm"[^>]*>([\s\S]*?)<\/h2>/gi;

    var videos = [];
    var match;
    var pluginId = "8c84b6b0-8d37-4f26-9b67-1d33c5f90a12";

    while ((match = pattern.exec(html)) !== null) {
        var url = match[1];
        var thumbnail = match[2];
        var title = match[3].replace(/<[^>]*>/g, "").trim();

        videos.push(new PlatformVideo({
            id: new PlatformID("Otakudesu", url, pluginId),
            name: title,
            thumbnails: new Thumbnails([
                new Thumbnail(thumbnail, 150)
            ]),
            author: new PlatformAuthorLink(
                new PlatformID("Otakudesu", "otakudesu", pluginId),
                "Otakudesu",
                "https://otakudesu.blog/",
                ""
            ),
            uploadDate: -1,
            duration: -1,
            viewCount: -1,
            url: url,
            isLive: false
        }));
    }

    log("Jumlah anime ditemukan: " + videos.length);

    return new VideoPager(videos, false, {});
};


source.isContentDetailsUrl = function (url) {
    return /otakudesu\.blog\/(anime|episode)\//i.test(url);
};

source.getContentDetails = function (url) {
    var response = http.GET(url, {}, false);

    if (!response.isOk) {
        throw new Error("Gagal membuka detail anime");
    }

    var html = response.body;
    var pluginId = "8c84b6b0-8d37-4f26-9b67-1d33c5f90a12";

    if (/otakudesu\.blog\/episode\//i.test(url)) {
        var episodeResponse = http.GET(url, {}, false);

        if (!episodeResponse.isOk) {
            throw new Error("Gagal membuka halaman episode");
        }

        var episodeHtml = episodeResponse.body;

        var iframeMatch = episodeHtml.match(
            /<iframe[^>]+src=["']([^"']+)["']/i
        );

        if (!iframeMatch) {
            throw new Error("Iframe video tidak ditemukan");
        }

        var playerResponse = http.GET(
            iframeMatch[1],
            {},
            false
        );

        if (!playerResponse.isOk) {
            throw new Error("Gagal membuka pemutar video");
        }

        var playerHtml = playerResponse.body;

        
        var videoMatch = playerHtml.match(
            /https:\/\/cdn\.odcloud\.net\/[^"' ]+\.mp4/i
        );

        if (!videoMatch) {
            throw new Error("URL MP4 tidak ditemukan");
        }

        var videoUrl = videoMatch[0];


        var titleMatch = episodeHtml.match(
            /<title[^>]*>([\s\S]*?)<\/title>/i
        );

        var episodeTitle = titleMatch
            ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
            : "Episode Anime";

        
        return new PlatformVideoDetails({
            id: new PlatformID("Otakudesu", url, pluginId),
            name: episodeTitle,
            thumbnails: new Thumbnails([]),
            author: new PlatformAuthorLink(
                new PlatformID("Otakudesu", "otakudesu", pluginId),
                "Otakudesu",
                "https://otakudesu.blog/",
                ""
            ),
            uploadDate: -1,
            duration: -1,
            viewCount: -1,
            url: url,
            isLive: false,
            description: "",
            video: new UnMuxVideoSourceDescriptor(
                [
                    new VideoUrlSource({
                        url: videoUrl,
                        container: "video/mp4",
                        name: "720p MP4",
                        width: 1280,
                        height: 720
                    })
                ],
                []
            )
        });

    }

    var titleMatch =
        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

    var title = titleMatch
        ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
        : "Detail Anime";

    var imageMatch =
        html.match(/<img[^>]+src="([^"]+)"[^>]*>/i);

    var thumbnail = imageMatch ? imageMatch[1] : "";
    log("URL detail: " + url);
    var episodes = [];
    var pattern =
        /<a[^>]+href="(https?:\/\/otakudesu\.blog\/episode\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    var match;

    while ((match = pattern.exec(html)) !== null) {
        var episodeUrl = match[1];
        var episodeTitle = match[2]
            .replace(/<[^>]*>/g, "")
            .trim();

        if (!episodeTitle) continue;

        episodes.push(new PlatformVideo({
            id: new PlatformID(
                "Otakudesu",
                episodeUrl,
                pluginId
            ),
            name: episodeTitle,
            thumbnails: new Thumbnails(
                thumbnail
                    ? [new Thumbnail(thumbnail, 150)]
                    : []
            ),
            author: new PlatformAuthorLink(
                new PlatformID("Otakudesu", "otakudesu", pluginId),
                "Otakudesu",
                "https://otakudesu.blog/",
                ""
            ),
            uploadDate: -1,
            duration: -1,
            viewCount: -1,
            url: episodeUrl,
            isLive: false
        }));
    }

    return new PlatformPlaylistDetails({
        id: new PlatformID("Otakudesu", url, pluginId),
        name: title,
        thumbnails: new Thumbnails(
            thumbnail
                ? [new Thumbnail(thumbnail, 150)]
                : []
                
        ),
        author: new PlatformAuthorLink(
            new PlatformID("Otakudesu", "otakudesu", pluginId),
            "Otakudesu",
            "https://otakudesu.blog/",
            ""
        ),
        uploadDate: -1,
        url: url,
        videoCount: episodes.length,
        thumbnail: thumbnail,
        contents: episodes 
    });
};

source.search = function (query, type, order, filters, continuationToken) {
    var searchUrl = "https://otakudesu.blog/?s=" +
        encodeURIComponent(query) + "&post_type=anime";

    var response = http.GET(searchUrl, {}, false);

    if (!response.isOk) {
        throw new Error("Gagal mencari anime di Otakudesu");
    }

    var html = response.body;
    var pluginId = "8c84b6b0-8d37-4f26-9b67-1d33c5f90a12";
    var videos = [];

    var pattern = /<a[^>]+href="(https?:\/\/otakudesu\.blog\/anime\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*class="jdlflm"[^>]*>([\s\S]*?)<\/h2>/gi;

    var match;

    while ((match = pattern.exec(html)) !== null) {
        var animeUrl = match[1];
        var thumbnail = match[2];
        var title = match[3].replace(/<[^>]*>/g, "").trim();

        videos.push(new PlatformVideo({
            id: new PlatformID("Otakudesu", animeUrl, pluginId),
            name: title,
            thumbnails: new Thumbnails([
                new Thumbnail(thumbnail, 150)
            ]),
            author: new PlatformAuthorLink(
                new PlatformID("Otakudesu", "otakudesu", pluginId),
                "Otakudesu",
                "https://otakudesu.blog/",
                ""
            ),
            uploadDate: -1,
            duration: -1,
            viewCount: -1,
            url: animeUrl,
            isLive: false
        }));
    }

    return new VideoPager(videos, false, {});
};
