import {App} from "./App.ts";

const SERVER_URL: string = 'http://localhost:4444';

export class SessionMenu {
    public showMenu(): void {
        // session input
        const sessionInput: HTMLInputElement = document.createElement('input');
        sessionInput.type = 'text';
        sessionInput.placeholder = 'Session name';

        // create session button
        const createSessionButton = document.createElement('button');
        createSessionButton.textContent = 'Create session';
        createSessionButton.onclick = (): void => {
            this._createSession(sessionInput.value);
        };

        const sessionGrid = document.createElement('div');
        sessionGrid.id = 'sessionGrid';

        const loadingText = document.createElement('p');
        loadingText.textContent = 'Loading sessions...';
        sessionGrid.appendChild(loadingText);

        this._getSessions(sessionGrid);

        const menu: Element = document.querySelector('#menu')!;
        menu.appendChild(sessionInput);
        menu.appendChild(createSessionButton);
        menu.appendChild(sessionGrid);
    }

    private async _getSessions(grid: HTMLDivElement): Promise<void> {
        try {
            const url: string = `${SERVER_URL}/sessions`;
            const response: Response = await fetch(url);
            const sessions: string[] = await response.json();

            grid.innerHTML = '';

            sessions.forEach((session: string): void => {
                const sessionButton = document.createElement('button');
                sessionButton.textContent = session;
                sessionButton.onclick = (): void => {
                    this._joinSession(session);
                    this._clearMenu();
                };
                grid.appendChild(sessionButton);
            });
        }
        catch (error) {
            console.error('Failed to get sessions', error);
        }
    }

    private _createSession(sessionName: string): void {
        if (sessionName === '') return;

        const app: App = App.getInstance();
        app.startScene(sessionName);

        this._clearMenu();
    }

    private _joinSession(sessionName: string): void {
        const app: App = App.getInstance();
        app.startScene(sessionName);

        this._clearMenu();
    }

    private _clearMenu(): void {
        const menu: Element = document.querySelector('#menu')!;
        menu.innerHTML = '';
    }
}