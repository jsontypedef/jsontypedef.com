use chrono::{DateTime, FixedOffset};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "createdAt")]
    pub createdAt: DateTime<FixedOffset>,

    #[serde(rename = "id")]
    pub id: String,

    #[serde(rename = "isAdmin")]
    pub isAdmin: bool,

    #[serde(rename = "karma")]
    pub karma: i32,
}
