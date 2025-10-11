use axum::{routing::get, Router};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = Router::new().route("/health", get(|| async { "ok" }));
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("focus_sync_server listening on http://{addr}");
    axum::Server::bind(&addr).serve(app.into_make_service()).await.unwrap();
}
