
var PLUGIN_ID = "8c84b6b0-8d37-4f26-9b67-1d33c5f90a12";
var BASE_URL = "https://otakudesu.blog/";

function cleanText(s) {
    return s
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#039;|&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function getHtml(url) {
    var r = http.GET(url, {}, false);

    if (!r.isOk) {
        throw new Error("Gagal membuka halaman Otakudesu: " + url);
    }

    return r.body;
}

function makeAuthor() {
    return new PlatformAuthorLink(
        new PlatformID("Otakudesu", "otakudesu", PLUGIN_ID),
        "Otakudesu",
        BASE_URL,
        ""
    );
}

function makeThumbnail(url) {
    return new Thumbnails(
        url ? [new Thumbnail(url, 150)] : []
    );
}

function makeEpisode(url, title, thumbnail) {
    return new PlatformVideo({
        id: new PlatformID("Otakudesu", url, PLUGIN_ID),
        name: title,
        thumbnails: makeThumbnail(thumbnail),
        author: makeAuthor(),
        uploadDate: -1,
        duration: -1,
        viewCount: -1,
        url: url,
        isLive: false
    });
}

function parseEpisodes(html, thumbnail) {
    var episodes = [];
    var seen = {};
    var pattern =
        /<a\b[^>]*href=["'](https?:\/\/[^"']*otakudesu\.blog\/episode\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    var m;

    while ((m = pattern.exec(html)) !== null) {
        var url = m[1];
        var title = cleanText(m[2]);

        if (!title || seen[url]) continue;

        seen[url] = true;

        episodes.push(makeEpisode(url, title, thumbnail));
    }

    return episodes;
}

function makeAnimePlaylist(url, title, thumbnail) {
    var html = getHtml(url);
    var episodes = parseEpisodes(html, thumbnail);

    log("Anime: " + title);
    log("Episode ditemukan: " + episodes.length);

    return new PlatformPlaylistDetails({
        id: new PlatformID("Otakudesu", url, PLUGIN_ID),
        name: title,
        thumbnails: makeThumbnail(thumbnail),
        author: makeAuthor(),
        uploadDate: -1,
        url: url,
        videoCount: episodes.length,
        thumbnail: thumbnail || "",
        contents: episodes
    });
}

source.enable = function (conf) {
    log("Otakudesu plugin enabled");
};

source.getHome = function (continuationToken) {
    var html = getHtml(BASE_URL);
    var videos = [];
    var seen = {};

    var pattern =
        /<a\b[^>]*href=["'](https?:\/\/[^"']*otakudesu\.blog\/anime\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    var m;

    while ((m = pattern.exec(html)) !== null) {
        var url = m[1];
        var item = m[2];

        if (seen[url]) continue;

        var img = item.match(
            /<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i
        );

        var heading = item.match(
            /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i
        );

        var title = heading
            ? cleanText(heading[1])
            : cleanText(item);

        if (!title) continue;

        seen[url] = true;

        videos.push(new PlatformVideo({
            id: new PlatformID("Otakudesu", url, PLUGIN_ID),
            name: title,
            thumbnails: makeThumbnail(img ? img[1] : ""),
            author: makeAuthor(),
            uploadDate: -1,
            duration: -1,
            viewCount: -1,
            url: url,
            isLive: false
        }));
    }

    return new VideoPager(videos, false, {});
};

source.search = function (
    query, type, order, filters, continuationToken
) {
    var searchUrl = BASE_URL + "?s=" +
        encodeURIComponent(query) + "&post_type=anime";

    var html = getHtml(searchUrl);
    var videos = [];
    var seen = {};

    var pattern =
        /<a\b[^>]*href=["'](https?:\/\/[^"']*otakudesu\.blog\/anime\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    var m;

    while ((m = pattern.exec(html)) !== null) {
        var url = m[1];
        var item = m[2];

        if (seen[url]) continue;

        var img = item.match(
            /<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/i
        );

        var heading = item.match(
            /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i
        );

        var title = heading
            ? cleanText(heading[1])
            : cleanText(item);

        if (!title) continue;

        seen[url] = true;

        var thumbnail = img ? img[1] : "";

        // Return playlist details directly so Grayjay can
        // display its episode list without getContentDetails.
        videos.push(makeAnimePlaylist(url, title, thumbnail));
    }

    log("Hasil pencarian: " + videos.length);

    return new VideoPager(videos, false, {});
};

source.isContentDetailsUrl = function (url) {
    return /otakudesu\.blog\/episode\//i.test(url);
};

source.getContentDetails = function (url) {
    if (!/otakudesu\.blog\/episode\//i.test(url)) {
        throw new Error(
            "URL ini bukan episode. Daftar episode ditampilkan melalui playlist."
        );
    }

    var html = getHtml(url);

    var titleMatch = html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
    );

    var title = titleMatch
        ? cleanText(titleMatch[1])
        : "Episode Anime";

    var iframeMatch = html.match(
        /<iframe\b[^>]*src=["']([^"']+)["']/i
    );

    if (!iframeMatch) {
        throw new Error("Server video tidak ditemukan di halaman episode");
    }

    var playerUrl = iframeMatch[1];

    if (playerUrl.indexOf("//") === 0) {
        playerUrl = "https:" + playerUrl;
    }

    var playerHtml = getHtml(playerUrl);

    var videoMatch = playerHtml.match(
        /<video\b[^>]*>[\s\S]*?<source\b[^>]*src=["']([^"']+)["']/i
    );

    if (!videoMatch) {
        videoMatch = playerHtml.match(
            /<source\b[^>]*src=["']([^"']+)["']/i
        );
    }

    if (!videoMatch) {
        videoMatch = playerHtml.match(
            /["']file["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
        );
    }

    if (!videoMatch) {
        throw new Error(
            "URL video langsung belum ditemukan. Server ini mungkin memerlukan ekstraksi khusus."
        );
    }

    var videoUrl = videoMatch[1]
        .replace(/&amp;/g, "&");

    return new PlatformVideoDetails({
        id: new PlatformID("Otakudesu", url, PLUGIN_ID),
        name: title,
        thumbnails: makeThumbnail(""),
        author: makeAuthor(),
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
                    name: "Otakudesu",
                    width: 0,
                    height: 0
                })
            ],
            []
        )
    });
};
