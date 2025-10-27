"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

export function InfoDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 md:gap-2 hover:bg-[var(--mars-blue-primary)] hover:text-white transition-colors bg-transparent text-xs md:text-sm"
        >
          <Info className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Info</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[var(--mars-blue-primary)]">
            Mars One-Pager - Функционал приложения
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-bold text-base mb-2">🎯 Основные возможности</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Создание и управление проектными one-pager документами</li>
              <li>Интерактивные диаграммы Ганта (годовой и квартальный планы)</li>
              <li>Управление KPI и финансовыми показателями</li>
              <li>Отслеживание рисков и артефактов проекта</li>
              <li>Автосохранение и версионирование (до 10 шагов назад)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">📊 Диаграммы Ганта</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Drag & Drop:</strong> Перетаскивайте бары и майлстоуны для изменения сроков
              </li>
              <li>
                <strong>Resize:</strong> Изменяйте длительность задач, потянув за края бара
              </li>
              <li>
                <strong>Статусы:</strong> Зелёный (On Track), Жёлтый (At Risk), Красный (Delayed)
              </li>
              <li>
                <strong>Линия "Мы здесь":</strong> Перетаскивайте для отметки текущего прогресса
              </li>
              <li>
                <strong>Майлстоуны:</strong> Добавляйте ключевые точки проекта
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">🖱️ Контекстное меню</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Правый клик:</strong> Открывает контекстное меню с действиями
              </li>
              <li>
                <strong>Ctrl + Click (Mac):</strong> Альтернатива правому клику
              </li>
              <li>
                <strong>Долгое нажатие:</strong> Для тачпадов и сенсорных экранов
              </li>
              <li>
                <strong>Двойной клик:</strong> Быстрое редактирование названий
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">⌨️ Горячие клавиши</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Ctrl + Z:</strong> Отменить последнее действие
              </li>
              <li>
                <strong>Ctrl + Shift + Z / Ctrl + Y:</strong> Повторить действие
              </li>
              <li>
                <strong>Ctrl + S:</strong> Сохранить проект (автосохранение включено)
              </li>
              <li>
                <strong>Ctrl + E:</strong> Экспорт в JSON
              </li>
              <li>
                <strong>Ctrl + P:</strong> Экспорт в PDF
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">💾 Экспорт и импорт</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>JSON:</strong> Сохранение и загрузка данных проекта
              </li>
              <li>
                <strong>PDF:</strong> Экспорт в цветной PDF (одно полотно без разрывов)
              </li>
              <li>
                <strong>HTML:</strong> Статичная HTML-страница для просмотра
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">🎨 Форматирование текста</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Выделите текст и нажмите правую кнопку мыши</li>
              <li>
                <strong>Жирный:</strong> Ctrl + B
              </li>
              <li>
                <strong>Курсив:</strong> Ctrl + I
              </li>
              <li>
                <strong>Подчёркнутый:</strong> Ctrl + U
              </li>
              <li>Добавление ссылок и блоков кода</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">🔄 Мультипроектность</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Создавайте несколько проектов</li>
              <li>Переключайтесь между проектами</li>
              <li>Дублируйте существующие проекты</li>
              <li>Каждый проект сохраняется отдельно с историей изменений</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">🎭 Режим презентации</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Добавьте ?presentation=true к URL</li>
              <li>Скрывает все элементы управления</li>
              <li>Идеально для демонстрации стейкхолдерам</li>
            </ul>
          </section>

          <section className="bg-blue-50 p-3 rounded-lg">
            <h3 className="font-bold text-base mb-2">💡 Советы</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Все изменения автоматически сохраняются в браузере</li>
              <li>Используйте контекстное меню для быстрого доступа к функциям</li>
              <li>Регулярно экспортируйте проекты в JSON для резервного копирования</li>
              <li>Верхнее меню появляется при наведении мыши на область шапки</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
