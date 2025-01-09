# SQL query builder

SQL query generator where you click on tables and columns to generate queries.
Useful when you often have to write `SELECT` statements on the same database schema.

## Setup
Download `generator.html` and `tables.js` from the
[build/ folder](https://github.com/ljacqu/TableJoinGenerator/tree/dist/build) in the `dist` branch.

`tables.js` has the table definitions the generator can work with. You can generate the data based on
your schema by using the files named after your database system in
[project/meta](https://github.com/ljacqu/TableJoinGenerator/tree/dist/project/meta). The SQL files hold 
queries you have to execute on the schema; the results should then be pasted into the HTML file. Paste the
result of the HTML file into `tables.js`.

Finally, there are also some configurations in `generator.html` that need to be adapted, such as the schema name.
The schema is optional (it can be set to an empty string).

### Table aliases
You can set table aliases in `tables.js` manually (the property is already there, just empty), or you can dynamically
build aliases by changing the function in the configuration section of `generator.html`. No validation is performed on
the aliases, for example to ensure that they are unique.

## Building queries
### Initial table/column selection
The page starts off with the list of tables it knows. Clicking on a table expands its columns, where you can filter.
- Entering a value will then filter rows by that
- Leaving the filter **empty** results in a filter for null values.
- Entering `!` results in a filter for `NOT NULL`.

Just want to select without a column filter? **Right-click** on the table to select the initial table with no filter.

### Add table with current query as subquery
After selecting an initial table, related tables are shown. Clicking on another table applies the current query
(with the initial table) as the subquery for the table you've selected. After that, the tables are again updated
to show related tables for the one you've newly selected. You can add another "level" of selected table like this
as many times as you wish.

This is the most basic and flexible way of getting some table data based on some constraints on another table.

### Add subquery to current table
Alternatively, you may see the button `⊆`, which will add a subquery to your current query. In other words, 
your current query is not transformed into a subquery but rather, a subquery is added to it. You can then optionally
add a column filter in the subquery.

### Left join tables
After adding subqueries to your satisfaction, you may want to join in another table in your select. This is done
by clicking on the `⟕` button.

Once you left join a table, the query builder goes into another mode and only allows you to left join additional tables.
The title changes to "Left join" and displays (table, column) pairs that can be added to the query.

## Development
Requires `npm`. 

- Run `npm run dev` for local development

All TS scripts are compiled into a file `build.js`.
In order to get all classes into the same JS file, all classes need to be in the same namespace – `QB`.
