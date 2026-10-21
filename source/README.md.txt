# WordPress Block Catalog — скилл Codex и учебник

Скилл `wordpress-block-catalog` помогает AI-агенту создавать редактируемые сайты-каталоги на WordPress: дочерняя тема Twenty Twenty-Five, блоки Gutenberg/GreenShift и отдельный PHP-плагин товаров. В репозитории также находятся пример реализации и инструменты сборки учебника для начинающего.

**[Читать HTML-учебник: 22 главы](https://wwwparser.github.io/wordpress-catalog-guide/)** · **[Открыть скилл](skill/wordpress-block-catalog/SKILL.md)** · **[Репозиторий учебника](https://github.com/wwwparser/wordpress-catalog-guide)**

## Для чего нужен скилл

- Создать каталог по макету или референсу с редактируемыми страницами.
- Отделить оформление темы от данных товаров, категорий, характеристик и галерей.
- Собрать главную, страницы категорий, карточки и форму заявки.
- Проверить не только дизайн, но и редактирование блоков, сохранение полей и заявки.

Это инструкция для агента, а не устанавливаемый WordPress-плагин и не готовый интернет-магазин. Корзина, оплата и складской учёт требуют отдельного решения. Пример каталога в папке `wordpress/` показывает применение подхода.

## Установка скилла в Codex

Попросите Codex:

```text
Установи скилл из https://github.com/wwwparser/wordpress-block-catalog-skill
Путь внутри репозитория: skill/wordpress-block-catalog
```

Или скопируйте папку `skill/wordpress-block-catalog` в `~/.codex/skills/wordpress-block-catalog` (на Windows: `%USERPROFILE%\.codex\skills\wordpress-block-catalog`). Если такая папка уже есть, сначала сравните версии. Скилл станет доступен на следующем ходу Codex.

Пример запроса:

```text
Используй $wordpress-block-catalog.
Создай локальный каталог по моему референсу: главная, три категории,
карточки товаров с характеристиками и галереей, форма заявки.
Страницы и товары должны редактироваться через админку WordPress.
Проверь сохранение данных и мобильную версию.
```

## Учебник и исходники

HTML-учебник содержит ручные действия и параллельное объяснение работы агента, примеры кода, снимки, упражнения, мини-тест и сохранение прогресса. Его опубликованные исходники подключены как подмодуль `tutorial/`.

```sh
git clone --recurse-submodules https://github.com/wwwparser/wordpress-block-catalog-skill.git
```

Если репозиторий уже скачан: `git submodule update --init --recursive`. GitHub Pages публикует учебник; сам WordPress с PHP и базой запускается отдельно.

В Git включены авторские исходники и описание. Готовая база, пароли, cookies, записи браузерной сессии, оригинальное видео и фотографии референса исключены. Команды ниже собирают отдельный локальный пример и требуют загрузки его материалов.

## Локальный пример проекта

Рабочий локальный прототип Cerlab, разбор ролика и повторяемый скилл Codex. Подробности: [анализ](docs/ANALYSIS.md), [редактирование](docs/EDITING.md), [скилл](skill/wordpress-block-catalog/SKILL.md).

Учебник для начинающего: https://wwwparser.github.io/wordpress-catalog-guide/ — 22 главы с ручными действиями, объяснением работы агента, примерами кода и упражнениями. Исходники опубликованного HTML-сайта находятся в `tutorial/`; сборка — `python scripts/build_tutorial.py`, локальная проверка — `python scripts/check_tutorial.py` при сервере на порту 8137.

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

При первом сборе скрипт загружает публичную главную в локальный кэш `research/reference.html`. Видео/распознавание исходного ролика не требуются для запуска готового прототипа.

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
