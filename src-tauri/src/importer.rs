use std::time::Duration;

use reqwest::{redirect, Client, Url};

const MAX_IMPORT_BYTES: usize = 2 * 1024 * 1024;
const ALLOWED_HOSTS: &[&str] = &["pastebin.com", "poe.ninja", "pobb.in", "maxroll.gg"];

#[tauri::command]
pub async fn fetch_import_url(url: String) -> Result<String, String> {
    let url = validate_url(&url)?;
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .redirect(redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 5 {
                return attempt.error("too many redirects");
            }
            if is_allowed_url(attempt.url()) {
                attempt.follow()
            } else {
                attempt.error("redirect target is not allowed")
            }
        }))
        .build()
        .map_err(|error| format!("Importer could not start: {error}"))?;

    let mut response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Download failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Download failed: {error}"))?;

    if response
        .content_length()
        .is_some_and(|length| length > MAX_IMPORT_BYTES as u64)
    {
        return Err("Import is larger than 2 MB.".to_string());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("Download failed: {error}"))?
    {
        if bytes.len() + chunk.len() > MAX_IMPORT_BYTES {
            return Err("Import is larger than 2 MB.".to_string());
        }
        bytes.extend_from_slice(&chunk);
    }
    String::from_utf8(bytes).map_err(|_| "Import is not valid UTF-8 text.".to_string())
}

fn validate_url(value: &str) -> Result<Url, String> {
    let url = Url::parse(value).map_err(|_| "Import URL is invalid.".to_string())?;
    if !is_allowed_url(&url) {
        return Err("This import host is not supported.".to_string());
    }
    Ok(url)
}

fn is_allowed_url(url: &Url) -> bool {
    url.scheme() == "https"
        && url.port_or_known_default() == Some(443)
        && url
            .host_str()
            .is_some_and(|host| ALLOWED_HOSTS.contains(&host))
        && url.username().is_empty()
        && url.password().is_none()
}

#[cfg(test)]
mod tests {
    use super::validate_url;

    #[test]
    fn accepts_only_https_urls_on_supported_hosts() {
        assert!(validate_url("https://pobb.in/example/raw").is_ok());
        assert!(validate_url("http://pobb.in/example/raw").is_err());
        assert!(validate_url("https://pobb.in:8443/example/raw").is_err());
        assert!(validate_url("https://pobb.in.evil.example/example").is_err());
        assert!(validate_url("https://user@pobb.in/example").is_err());
        assert!(validate_url("file:///C:/LatestClient.txt").is_err());
    }
}
