SELECT a.table_name child_table, a.column_name child_column,
       b.table_name parent_table, b.column_name parent_column
FROM all_cons_columns a
JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name
JOIN all_cons_columns b ON c.owner = b.owner AND c.r_constraint_name = b.constraint_name
WHERE c.constraint_type = 'R'
  AND c.owner = 'nightbot_quiz' -- CHANGE ME