mod commands;
mod db;

use db::{DbState, EncryptedPathsState, EncryptionSetupState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            match db::init_db(app.handle()) {
                Ok((conn, paths)) => {
                    app.manage(DbState(std::sync::Mutex::new(Some(conn))));
                    app.manage(EncryptedPathsState(std::sync::Mutex::new(paths)));
                    app.manage(EncryptionSetupState(std::sync::Mutex::new(None)));
                }
                Err(db::InitDbError::NeedSetup(reason)) => {
                    app.manage(DbState(std::sync::Mutex::new(None)));
                    app.manage(EncryptedPathsState(std::sync::Mutex::new(None)));
                    app.manage(EncryptionSetupState(std::sync::Mutex::new(Some(reason))));
                }
                Err(e) => return Err(e.to_string().into()),
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let app = window.app_handle();
                if let Some(db) = app.try_state::<DbState>() {
                    if let Some(paths) = app.try_state::<EncryptedPathsState>() {
                        let guard_db = db.0.lock().unwrap();
                        let guard_paths = paths.0.lock().unwrap();
                        if let (Some(ref conn), Some((ref temp, ref enc))) =
                            (guard_db.as_ref(), guard_paths.as_ref())
                        {
                            let _ = db::flush_encrypted_db(conn, temp.as_path(), enc.as_path());
                        }
                    }
                }
            }
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
            commands::write_export_file,
            commands::get_encryption_state,
            commands::encryption_setup_create_key,
            commands::encryption_migrate_plain_db,
            commands::encryption_setup_open_db,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
