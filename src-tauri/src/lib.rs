mod commands;
mod db;

use db::DbState;
use tauri::Manager;
use tauri_plugin_notification::NotificationExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let conn = db::init_db(app.handle()).map_err(|e| e.to_string())?;
            app.manage(DbState(std::sync::Mutex::new(Some(conn))));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::contact_list,
            commands::contact_get,
            commands::contact_create,
            commands::contact_update,
            commands::contact_delete,
            commands::note_list,
            commands::note_create,
            commands::reminder_list,
            commands::reminder_create,
            commands::reminder_complete,
            commands::reminder_snooze,
            commands::import_contacts,
            commands::search_contacts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
