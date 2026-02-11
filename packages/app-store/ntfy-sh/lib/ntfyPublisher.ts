interface NtfyPublisherParams {
    baseUrl: string;
    topic: string;
    username?: string;
    password?: string;
    title: string;
    body: string;
}

export async function ntfyPublisher(params: NtfyPublisherParams) {
    const url = new URL(params.baseUrl);
    url.pathname = `/${params.topic}`

    const authHeader = (params.username && params.password) ? 
        `Basic ${btoa(`${params.username}:${params.password}`)}` : undefined;

    return await fetch(url.toString(), {
        method: "POST",
        headers: {
            ...(authHeader ? { "Authorization": authHeader } : {}),
            "Title": params.title
        },
        body: params.body
    })
    
}

