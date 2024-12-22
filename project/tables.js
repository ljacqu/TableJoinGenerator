const __tables = {
    "nq_draw": {
        "alias": "dr",
        "columns": {
            "id": "int",
            "question_id": "int",
            "owner_id": "int",
            "created": "datetime",
            "solved": "datetime"
        },
        "references": {
            "owner_id": [{
                "table": "nq_owner",
                "column": "id"
            }],
            "question_id": [{
                "table": "nq_question",
                "column": "id"
            }]
        },
        "highlights": {}
    },
    "nq_draw_answer": {
        "alias": "ans",
        "columns": {
            "id": "int",
            "draw_id": "int",
            "created": "datetime",
            "user": "varchar",
            "answer": "varchar",
            "score": "decimal"
        },
        "references": {
            "draw_id": [{
                "table": "nq_draw",
                "column": "id"
            }]
        },
        "highlights": {}
    },
    "nq_draw_stats": {
        "alias": "stat",
        "columns": {
            "id": "int",
            "draw_id": "int",
            "last_question": "datetime",
            "last_answer": "datetime",
            "times_question_queried": "int",
            "last_question_repeat": "datetime"
        },
        "references": {
            "draw_id": [{
                "table": "nq_draw",
                "column": "id"
            }]
        },
        "highlights": {}
    },
    "nq_owner": {
        "alias": "own",
        "columns": {
            "id": "int",
            "name": "varchar",
            "secret": "varchar",
            "settings_id": "int",
            "password": "varchar",
            "is_admin": "tinyint",
            "stats_id": "int"
        },
        "references": {
            "settings_id": [{
                "table": "nq_settings",
                "column": "id"
            }],
            "stats_id": [{
                "table": "nq_owner_stats",
                "column": "id"
            }]
        },
        "highlights": {}
    },
    "nq_owner_nightbot": {
        "alias": "nbot",
        "columns": {
            "id": "int",
            "owner_id": "int",
            "client_id": "varchar",
            "client_secret": "varchar",
            "token": "varchar",
            "token_expires": "int",
            "refresh_token": "varchar",
            "tw_token": "varchar",
            "tw_token_expires": "int",
            "tw_refresh_token": "varchar"
        },
        "references": {
            "owner_id": [{
                "table": "nq_owner",
                "column": "id"
            }]
        },
        "highlights": {}
    },
    "nq_owner_stats": {
        "alias": "ownstat",
        "columns": {
            "id": "int",
            "data_url": "varchar",
            "public_page_url": "varchar"
        },
        "references": {},
        "highlights": {}
    },
    "nq_question": {
        "alias": "q",
        "columns": {
            "id": "int",
            "owner_id": "int",
            "ukey": "varchar",
            "question": "varchar",
            "answer": "varchar",
            "type": "varchar",
            "category": "varchar"
        },
        "references": {
            "owner_id": [{
                "table": "nq_owner",
                "column": "id"
            }]
        },
        "highlights": {}
    },
    "nq_secret": {
        "alias": "sec",
        "columns": {
            "id": "int",
            "type": "varchar",
            "value": "varchar",
            "owner_id": "int"
        },
        "references": {
            "owner_id": [
                {
                    "table": "nq_owner",
                    "column": "id",
                    "joinVariants": [
                        {
                            "name": "demo",
                            "filter": "type = 'DEMO'"
                        },
                        {
                            "name": "real",
                            "filter": "type = 'REAL'"
                        }
                    ]
                },
                {
                    "table": "nq_draw",
                    "column": "owner_id"
                }
            ]
        },
        "highlights": {
        }
    },
    "nq_settings": {
        "alias": "stg",
        "columns": {
            "id": "int",
            "active_mode": "varchar",
            "timer_solve_creates_new_question": "tinyint",
            "timer_unsolved_question_wait": "int",
            "timer_solved_question_wait": "int",
            "timer_last_answer_wait": "int",
            "timer_last_question_query_wait": "int",
            "user_new_wait": "int",
            "history_display_entries": "int",
            "history_avoid_last_answers": "int",
            "debug_mode": "int",
            "high_score_days": "int",
            "twitch_name": "varchar",
            "timer_countdown_seconds": "int",
            "repeat_unanswered_question": "int"
        },
        "references": {},
        "highlights": {}
    }
};