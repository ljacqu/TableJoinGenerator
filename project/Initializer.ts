namespace QB {

    export class Initializer {

        private __construct() {
        }

        static init(__version: string, __tables: any, __aliasFn: any, __schema: string,
                    __dbEngine: string, __debug: boolean, __showWhereInButton: boolean): void {

            TableDefinitions.init(__tables);
            
            // Create all members
            const sqlTypeHandler = new SqlTypeHandler(__dbEngine);
            const formatter = new Formatter(sqlTypeHandler, __aliasFn, __schema);
            const query = new QueryState();
            const aggregateButton = new AggregateButton(DocElemHelper.getElementById('btn_agg'));
            const queryService = new QueryService(query, formatter, __debug, __showWhereInButton);
            const selectColumnMenu = new SelectColumnMenu(queryService, sqlTypeHandler);
            const menuHandler = new MenuHandler(DocElemHelper.getElementById('tables'),
                aggregateButton, queryService, sqlTypeHandler, selectColumnMenu);

            // Set up button onclick behavior
            DocElemHelper.getElementById('btn_reset').addEventListener('click',
                () => menuHandler.showInitialTables());
            aggregateButton.initializeOnClickHandler(() => {
                queryService.updateQuery(query => {
                    const newValue = aggregateButton.toggle();
                    query.setAggregate(newValue);
                });
            });

            const hint = DocElemHelper.getElementById('copied_hint');
            DocElemHelper.getElementById('btn_copy').addEventListener('click', () => {
                navigator.clipboard.writeText(DocElemHelper.getElementById('query').innerText);
                hint.classList.add('show');
                setTimeout(() => hint.classList.remove('show'), 800); // matches the fade duration in CSS
            });

            // Initialization
            menuHandler.showInitialTables();
            DocElemHelper.getElementById('version').innerText = `v. ${__version}`;
        }
    }
}
