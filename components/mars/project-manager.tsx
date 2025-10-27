"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAllProjects, deleteProject, type Project } from "@/lib/storage"
import { Plus, Trash2, Copy, FolderOpen } from "lucide-react"

interface ProjectManagerProps {
  currentProjectId: string | null
  onSelectProject: (project: Project) => void
  onCreateNew: (name: string) => void
  onDuplicate: (project: Project) => void
}

export function ProjectManager({ currentProjectId, onSelectProject, onCreateNew, onDuplicate }: ProjectManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const projects = getAllProjects()

  const handleCreate = () => {
    if (newProjectName.trim()) {
      onCreateNew(newProjectName.trim())
      setNewProjectName("")
    }
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject(id)
      window.location.reload()
    }
  }

  return (
    <div className="relative">
      <Button onClick={() => setIsOpen(!isOpen)} variant="outline" className="gap-2">
        <FolderOpen className="w-4 h-4" />
        Projects ({projects.length})
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <Card className="absolute top-12 left-0 z-50 w-96 p-4 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-[var(--mars-blue-primary)]">Project Manager</h3>

            {/* Create new project */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="New project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Create
              </Button>
            </div>

            {/* Project list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No projects yet. Create your first one!</p>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 rounded-lg border transition-all ${
                      project.id === currentProjectId
                        ? "border-[var(--mars-blue-primary)] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => {
                          onSelectProject(project)
                          setIsOpen(false)
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="font-semibold text-sm">{project.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Updated: {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </button>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDuplicate(project)}
                          title="Duplicate project"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(project.id)}
                          title="Delete project"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
