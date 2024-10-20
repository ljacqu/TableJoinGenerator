const __tables = {
  "nq_draw": {
    "columns": {
      "id": 1,
      "question_id": 1,
      "owner_id": 1,
      "created": 1,
      "solved": 1
    },
    "references": {
      "owner_id": {
        "table": "nq_owner",
        "column": "id"
      }
    }
  },
  "nq_draw_answer": {
    "columns": {
      "id": 1,
      "draw_id": 1,
      "created": 1,
      "user": 1,
      "answer": 1,
      "score": 1
    },
    "references": {
      "draw_id": {
        "table": "nq_draw",
        "column": "id"
      }
    }
  },
  "nq_draw_stats": {
    "columns": {
      "id": 1,
      "draw_id": 1,
      "last_question": 1,
      "last_answer": 1,
      "times_question_queried": 1,
      "last_question_repeat": 1
    },
    "references": {
      "draw_id": {
        "table": "nq_draw",
        "column": "id"
      }
    }
  },
  "nq_owner": {
    "columns": {
      "id": 1,
      "name": 1,
      "secret": 1,
      "settings_id": 1,
      "password": 1,
      "is_admin": 1,
      "stats_id": 1
    },
    "references": {
      "settings_id": {
        "table": "nq_settings",
        "column": "id"
      },
      "stats_id": {
        "table": "nq_owner_stats",
        "column": "id"
      }
    }
  },
  "nq_owner_nightbot": {
    "columns": {
      "id": 1,
      "owner_id": 1,
      "client_id": 1,
      "client_secret": 1,
      "token": 1,
      "token_expires": 1,
      "refresh_token": 1,
      "tw_token": 1,
      "tw_token_expires": 1,
      "tw_refresh_token": 1
    },
    "references": {
      "owner_id": {
        "table": "nq_owner",
        "column": "id"
      }
    }
  },
  "nq_owner_stats": {
    "columns": {
      "id": 1,
      "data_url": 1,
      "public_page_url": 1
    },
    "references": {}
  },
  "nq_question": {
    "columns": {
      "id": 1,
      "owner_id": 1,
      "ukey": 1,
      "question": 1,
      "answer": 1,
      "type": 1,
      "category": 1
    },
    "references": {
      "owner_id": {
        "table": "nq_owner",
        "column": "id"
      }
    }
  },
  "nq_settings": {
    "columns": {
      "id": 1,
      "active_mode": 1,
      "timer_solve_creates_new_question": 1,
      "timer_unsolved_question_wait": 1,
      "timer_solved_question_wait": 1,
      "timer_last_answer_wait": 1,
      "timer_last_question_query_wait": 1,
      "user_new_wait": 1,
      "history_display_entries": 1,
      "history_avoid_last_answers": 1,
      "debug_mode": 1,
      "high_score_days": 1,
      "twitch_name": 1,
      "timer_countdown_seconds": 1,
      "repeat_unanswered_question": 1
    },
    "references": {}
  }
};
