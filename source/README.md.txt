# WordPress-каталог по технологии из видео

Рабочий локальный прототип Cerlab, разбор ролика и повторяемый скилл Codex. Подробности: [анализ](docs/ANALYSIS.md), [редактирование](docs/EDITING.md), [скилл](skill/wordpress-block-catalog/SKILL.md).

## Открыть

- Сайт: http://127.0.0.1:8136/
- Админка: http://127.0.0.1:8136/wp-admin/
- Логин и пароль: `runtime/credentials.json`.

Если сервер остановлен, выполните `./start.ps1` в этой папке. Для остановки — Ctrl+C. Сервер предназначен для локальной проверки.

## Повторная сборка

Нужны PHP с `pdo_sqlite`, Python, ffmpeg и Python-пакеты из `requirements.txt`. Все команды выполняются из корня проекта. WordPress и плагины загружаются с официальных сайтов. Перед запуском новых версий ознакомьтесь с их кодом и изменениями.

```powershell
python scripts/download_runtime.py
python scripts/collect_reference.py
python scripts/prepare_media.py
python scripts/setup_local.py
./start.ps1
```

Для сбора референса требуется `research/reference.html`, уже сохранённый в проекте. При обновлении скачайте публичную главную через `src/services/reference_client.py` и сохраните в этот файл. Видео/распознавание не требуются для запуска готового прототипа.

`setup_local.py` обновляет собственные исходники в runtime; при повторном запуске сохраняет уже созданный контент и пароль. Он рассчитан только на выделенный стенд этого проекта.

## Проверка и упаковка

При запущенном сервере:

```powershell
python scripts/check_demo.py
python scripts/package_wordpress.py wordpress/wp-content/themes/cerlab-child dist/cerlab-child.zip
python scripts/package_wordpress.py wordpress/wp-content/plugins/cerlab-catalog dist/cerlab-catalog.zip
```

`check_demo.py` использует установленный Chromium Playwright. Проверяет маршруты, изображения, четыре ширины экрана, меню, сохранение формы, доступность редактора, валидность GreenShift и изменение характеристик через WordPress API. Результат — `research/verification.json`; тестовые заявки удаляются, характеристика возвращается к исходной.

## Состав MVP

Настоящий WordPress, дочерняя Twenty Twenty-Five, GreenShift, отдельный плагин каталога, пять категорий, восемь товаров с исходными изображениями и характеристиками, галерея и локальные заявки. Это сокращённое воспроизведение дизайна и технологии, а не полный перенос исходного сайта и его Figma.

Материалы: [видео Nikita Iudin](https://www.youtube.com/watch?v=OmzKdzCdfBA), [сайт Cerlab](https://cer-lab.ru/). Использованы для локальной проверки.
