import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface Deadline {
    id: string;
    title: string;
    description: string;
    dueDate: string;
}

const deadlinesFile = path.join(vscode.workspace.rootPath || '', 'deadlines.json');

export function activate(context: vscode.ExtensionContext) {
    console.log('DeadlineReminder активирован');

    let addDisposable = vscode.commands.registerCommand('deadlineReminder.addDeadline', async () => {
        try {
            const title = await vscode.window.showInputBox({ prompt: 'Введите название задачи' });
            if (!title) return;

            const description = await vscode.window.showInputBox({ prompt: 'Введите описание задачи' });
            if (!description) return;

            const dueDateInput = await vscode.window.showInputBox({ prompt: 'Введите дату дедлайна (YYYY-MM-DD HH:MM)' });
            if (!dueDateInput) return;

            const dueDate = new Date(dueDateInput);
            if (isNaN(dueDate.getTime())) {
                vscode.window.showErrorMessage('Некорректный формат даты. Пожалуйста, используйте формат YYYY-MM-DD HH:MM');
                return;
            }

            const deadline: Deadline = {
                id: Date.now().toString(),
                title,
                description,
                dueDate: dueDate.toISOString()
            };

            let deadlines: Deadline[] = [];
            if (fs.existsSync(deadlinesFile)) {
                const data = fs.readFileSync(deadlinesFile, 'utf-8');
                deadlines = JSON.parse(data);
            }

            deadlines.push(deadline);
            fs.writeFileSync(deadlinesFile, JSON.stringify(deadlines, null, 2));

            vscode.window.showInformationMessage(Дедлайн "${title}" добавлен);
            scheduleReminders(deadline);
            syncWithGoogleCalendar(deadline);
        } catch (error) {
            vscode.window.showErrorMessage('Произошла ошибка при добавлении дедлайна');
            console.error(error);
        }
    });

    let viewDisposable = vscode.commands.registerCommand('deadlineReminder.viewDeadlines', () => {
        if (!fs.existsSync(deadlinesFile)) {
            vscode.window.showInformationMessage('Нет добавленных дедлайнов');
            return;
        }

        const data = fs.readFileSync(deadlinesFile, 'utf-8');
        const deadlines: Deadline[] = JSON.parse(data);

        const deadlineItems = deadlines.map(dl => ${dl.title} - ${new Date(dl.dueDate).toLocaleString()});

        vscode.window.showQuickPick(deadlineItems, { placeHolder: 'Текущие дедлайны' });
    });

    context.subscriptions.push(addDisposable, viewDisposable);

    if (fs.existsSync(deadlinesFile)) {
        const data = fs.readFileSync(deadlinesFile, 'utf-8');
        const deadlines: Deadline[] = JSON.parse(data);

        deadlines.forEach(deadline => {
            scheduleReminders(deadline);
        });
    }
}

function scheduleReminders(deadline: Deadline) {
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
}

async function syncWithGoogleCalendar(deadline: Deadline) {
    try {
        const token = 'YOUR_GOOGLE_API_TOKEN';
        const event = {
            summary: deadline.title,
            description: deadline.description,
            start: {
                dateTime: new Date(deadline.dueDate).toISOString(),
                timeZone: 'Europe/Moscow'
            },
            end: {
                dateTime: new Date(new Date(deadline.dueDate).getTime() + 60 * 60 * 1000).toISOString(),
                timeZone: 'Europe/Moscow'
            }
        };

        await axios.post('https://www.googleapis.com/calendar/v3/calendars/primary/events', event, {
            headers: {
                'Authorization': Bearer ${token},
                'Content-Type': 'application/json'
            }
        });

        vscode.window.showInformationMessage(Дедлайн "${deadline.title}" синхронизирован с Google Calendar);
    } catch (error) {
        vscode.window.showErrorMessage('Не удалось синхронизировать дедлайн с Google Calendar');
        console.error(error);
    }
}

export function deactivate() {}