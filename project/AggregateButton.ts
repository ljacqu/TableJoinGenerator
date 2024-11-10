namespace QB {

    export class AggregateButton {

        constructor(private buttonElement: HTMLElement) {
        }

        hide(): void {
            this.buttonElement.style.display = 'none';
            this.turnOff();
        }

        show(): void {
            this.buttonElement.style.display = 'inline-block';
        }

        turnOff(): void {
            this.buttonElement.classList.remove('btn-active');
        }

        toggle(): boolean {
            if (this.buttonElement.classList.contains('btn-active')) {
                this.buttonElement.classList.remove('btn-active');
                return false;
            } else {
                this.buttonElement.classList.add('btn-active');
                return true;
            }
        }

        initializeOnClickHandler(onClickFunction: any): void {
            this.buttonElement.addEventListener('click', onClickFunction);
        }
    }
}