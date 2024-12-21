import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface Deadline {
    id: string;
    title: string;
    description: string;
    dueDate: string;
}

const deadlinesFile = path.join(vscode.workspace.rootPath || '', 'deadlines.json');

export function activate(context: vscode.ExtensionContext) {
    console.log('DeadlineReminder активирован');

    let disposable = vscode.commands.registerCommand('deadlineReminder.addDeadline', async () => {
        const title = await vscode.window.showInputBox({ prompt: 'Введите название задачи' });
        if (!title) return;

        const description = await vscode.window.showInputBox({ prompt: 'Введите описание задачи' });
        if (!description) return;

        const dueDate = await vscode.window.showInputBox({ prompt: 'Введите дату дедлайна (YYYY-MM-DD HH:MM)' });
        if (!dueDate) return;

        const deadline: Deadline = {
            id: Date.now().toString(),
            title,
            description,
            dueDate
        };

        let deadlines: Deadline[] = [];
        if (fs.existsSync(deadlinesFile)) {
            const data = fs.readFileSync(deadlinesFile, 'utf-8');
            deadlines = JSON.parse(data);
        }

        deadlines.push(deadline);
        fs.writeFileSync(deadlinesFile, JSON.stringify(deadlines, null, 2));

        vscode.window.showInformationMessage(Дедлайн "${title}" добавлен);
    });

    context.subscriptions.push(disposable);

    if (fs.existsSync(deadlinesFile)) {
        const data = fs.readFileSync(deadlinesFile, 'utf-8');
        const deadlines: Deadline[] = JSON.parse(data);

        deadlines.forEach(deadline => {
            const due = new Date(deadline.dueDate).getTime();
            const now = Date.now();

            const oneDayBefore = due - now - (24 * 60 * 60 * 1000);
            const oneHourBefore = due - now - (60 * 60 * 1000);

            if (oneDayBefore > 0) {
                setTimeout(() => {
                    vscode.window.showWarningMessage(Напоминание: До дедлайна "${deadline.title}" остался 1 день);
                }, oneDayBefore);
            }

            if (oneHourBefore > 0) {
                setTimeout(() => {
                    vscode.window.showWarningMessage(Напоминание: До дедлайна "${deadline.title}" остался 1 час);
                }, oneHourBefore);
            }
        });
    }
}

export function deactivate() {}