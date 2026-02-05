mod commands;
mod db;

use db::DbState;
use tauri::Manager;

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
            commands::company_list,
            commands::company_get,
            commands::company_create,
            commands::company_update,
            commands::contact_list_by_company,
            commands::custom_field_list,
            commands::custom_field_create,
            commands::contact_custom_values_get,
            commands::contact_custom_values_set,
            commands::contact_ids_by_custom_value,
            commands::note_list,
            commands::note_create,
            commands::interaction_list,
            commands::interaction_create,
            commands::reminder_list,
            commands::reminder_create,
            commands::reminder_complete,
            commands::reminder_snooze,
            commands::attachments_dir_get,
            commands::attachments_dir_set,
            commands::attachment_list,
            commands::attachment_add,
            commands::attachment_delete,
            commands::attachment_open,
            commands::import_contacts,
            commands::search_contacts,
            commands::global_search,
            commands::contact_ids_with_hashtag,
            commands::dedup_candidates,
            commands::contact_merge,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
