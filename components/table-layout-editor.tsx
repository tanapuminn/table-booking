"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, Move, RotateCcw, Grid } from "lucide-react"
import { useBooking, type TablePosition } from "./booking-provider"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function TableLayoutEditor() {
  const { tablePositions, updateTablePosition, addTable, removeTable, toggleTableActive, zoneConfigs } = useBooking()
  const { toast } = useToast()
  const [selectedZone, setSelectedZone] = useState("A")
  const [isEditMode, setIsEditMode] = useState(false)
  const [draggedTable, setDraggedTable] = useState<TablePosition | null>(null)

  // เน€เธเธดเนเธก state เธชเธณเธซเธฃเธฑเธเธเธเธฒเธ” grid
  const [gridSize, setGridSize] = useState({ rows: 10, cols: 10 })
  const [newGridSize, setNewGridSize] = useState({ rows: 10, cols: 10 })
  const [showGridSizeDialog, setShowGridSizeDialog] = useState(false)

  const cellSize = 60

  // เธเธฃเธญเธเนเธ•เนเธฐเธ•เธฒเธกเนเธเธเธ—เธตเนเน€เธฅเธทเธญเธ
  const zoneTables = tablePositions.filter((table) => table.zone === selectedZone)
  const activeZone = zoneConfigs.find((zone) => zone.id === selectedZone)

  // เนเธซเธฅเธ”เธเธเธฒเธ” grid เธเธฒเธ localStorage เน€เธกเธทเนเธญ component mount
  useEffect(() => {
    try {
      const savedGridSize = localStorage.getItem(`gridSize_${selectedZone}`)
      if (savedGridSize) {
        const parsedSize = JSON.parse(savedGridSize)
        setGridSize(parsedSize)
        setNewGridSize(parsedSize)
      }
    } catch (error) {
      console.error("Error loading grid size from localStorage:", error)
    }
  }, [selectedZone])

  // เธเธฑเธเธ—เธถเธเธเธเธฒเธ” grid เธฅเธ localStorage เน€เธกเธทเนเธญเธกเธตเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเนเธเธฅเธ
  useEffect(() => {
    try {
      localStorage.setItem(`gridSize_${selectedZone}`, JSON.stringify(gridSize))
    } catch (error) {
      console.error("Error saving grid size to localStorage:", error)
    }
  }, [gridSize, selectedZone])

  const handleCellClick = async (x: number, y: number) => {
    if (!isEditMode) return

    const existingTable = zoneTables.find((table) => table.x === x && table.y === y)
    if (existingTable) {
      toast({
        title: "เธ•เธณเนเธซเธเนเธเธเธตเนเธกเธตเนเธ•เนเธฐเนเธฅเนเธง",
        description: "เธเธฃเธธเธ“เธฒเน€เธฅเธทเธญเธเธ•เธณเนเธซเธเนเธเธญเธทเนเธ เธซเธฃเธทเธญเธฅเธเนเธ•เนเธฐเน€เธ”เธดเธกเธเนเธญเธ",
        variant: "destructive",
      })
      return
    }

    try {
    await addTable(selectedZone, x, y);
    toast({
      title: "เน€เธเธดเนเธกเนเธ•เนเธฐเธชเธณเน€เธฃเนเธ",
      description: `เน€เธเธดเนเธกเนเธ•เนเธฐเนเธเนเธเธ ${selectedZone} เธ—เธตเนเธ•เธณเนเธซเธเนเธ (${x}, ${y})`,
    });
  } catch (error) {
    toast({
      title: "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”",
      description: (error instanceof Error ? error.message : "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เน€เธเธดเนเธกเนเธ•เนเธฐเนเธ”เน"),
      variant: "destructive",
    });
  }
}

const handleTableDragStart = (table: TablePosition) => {
  if (!isEditMode) return
  setDraggedTable(table)
}

const handleTableDrop = (x: number, y: number) => {
  if (!draggedTable || !isEditMode) return

  // เธ•เธฃเธงเธเธชเธญเธเธงเนเธฒเธ•เธณเนเธซเธเนเธเนเธซเธกเนเธงเนเธฒเธเธซเธฃเธทเธญเนเธกเน
  const existingTable = zoneTables.find((table) => table.x === x && table.y === y && table.id !== draggedTable.id)

  if (existingTable) {
    toast({
      title: "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธขเนเธฒเธขเนเธ”เน",
      description: "เธ•เธณเนเธซเธเนเธเธเธตเนเธกเธตเนเธ•เนเธฐเธญเธทเนเธเธญเธขเธนเนเนเธฅเนเธง",
      variant: "destructive",
    })
    setDraggedTable(null)
    return
  }

  updateTablePosition(draggedTable.id, x, y)
  toast({
    title: "เธขเนเธฒเธขเนเธ•เนเธฐเธชเธณเน€เธฃเนเธ",
    description: `เธขเนเธฒเธข${draggedTable.name} เนเธเธขเธฑเธเธ•เธณเนเธซเธเนเธ (${x}, ${y})`,
  })
  setDraggedTable(null)
}

const handleRemoveTable = (tableId: number) => {
  removeTable(tableId)
  toast({
    title: "เธฅเธเนเธ•เนเธฐเธชเธณเน€เธฃเนเธ",
    description: "เธฅเธเนเธ•เนเธฐเธญเธญเธเธเธฒเธเธฃเธฐเธเธเน€เธฃเธตเธขเธเธฃเนเธญเธขเนเธฅเนเธง",
  })
}

const resetLayout = () => {
  // เธฃเธตเน€เธเนเธ•เน€เธเนเธเธ•เธณเนเธซเธเนเธเน€เธฃเธดเนเธกเธ•เนเธ
  const defaultPositions = Array.from({ length: 20 }, (_, i) => ({
    x: (i % 5) * 2,
    y: Math.floor(i / 5) * 2,
  }))

  zoneTables.forEach((table, index) => {
    if (defaultPositions[index]) {
      updateTablePosition(table.id, defaultPositions[index].x, defaultPositions[index].y)
    }
  })

  toast({
    title: "เธฃเธตเน€เธเนเธ•เน€เธฅเธขเนเน€เธญเธฒเธ•เนเธชเธณเน€เธฃเนเธ",
    description: `เธฃเธตเน€เธเนเธ•เธ•เธณเนเธซเธเนเธเนเธ•เนเธฐเนเธเนเธเธ ${selectedZone} เน€เธเนเธเธเนเธฒเน€เธฃเธดเนเธกเธ•เนเธ`,
  })
}

// เน€เธเธดเนเธกเธเธฑเธเธเนเธเธฑเธเธชเธณเธซเธฃเธฑเธเธเธฃเธฑเธเธเธเธฒเธ” grid
const handleResizeGrid = () => {
  // เธ•เธฃเธงเธเธชเธญเธเธงเนเธฒเธกเธตเนเธ•เนเธฐเธ—เธตเนเธญเธขเธนเนเธเธญเธเธเธญเธเน€เธเธ•เนเธซเธกเนเธซเธฃเธทเธญเนเธกเน
  const tablesOutOfBounds = zoneTables.filter((table) => table.x >= newGridSize.cols || table.y >= newGridSize.rows)

  if (tablesOutOfBounds.length > 0) {
    toast({
      title: "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฃเธฑเธเธเธเธฒเธ”เนเธ”เน",
      description: `เธกเธตเนเธ•เนเธฐ ${tablesOutOfBounds.length} เนเธ•เนเธฐเธ—เธตเนเธเธฐเธญเธขเธนเนเธเธญเธเธเธญเธเน€เธเธ•เนเธซเธกเน เธเธฃเธธเธ“เธฒเธขเนเธฒเธขเนเธ•เนเธฐเธเนเธญเธ`,
      variant: "destructive",
    })
    return
  }

  setGridSize(newGridSize)
  setShowGridSizeDialog(false)

  toast({
    title: "เธเธฃเธฑเธเธเธเธฒเธ” Grid เธชเธณเน€เธฃเนเธ",
    description: `เธเธฃเธฑเธเธเธเธฒเธ” Grid เน€เธเนเธ ${newGridSize.rows} เนเธ–เธง x ${newGridSize.cols} เธเธญเธฅเธฑเธกเธเน`,
  })
}

const getTableAtPosition = (x: number, y: number) => {
  return zoneTables.find((table) => table.x === x && table.y === y)
}

const getZoneColor = (zone: string) => {
  switch (zone) {
    case "A":
      return "border-blue-200 bg-blue-50"
    case "B":
      return "border-green-200 bg-green-50"
    case "C":
      return "border-purple-200 bg-purple-50"
    default:
      return "border-gray-200 bg-gray-50"
  }
}

const getTableColor = (table: TablePosition) => {
  if (!table.isActive) return "bg-gray-300 border-gray-400"
  switch (table.zone) {
    case "A":
      return "bg-blue-100 border-blue-300"
    case "B":
      return "bg-green-100 border-green-300"
    case "C":
      return "bg-purple-100 border-purple-300"
    default:
      return "bg-amber-100 border-amber-300"
  }
}

return (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            เธเธฑเธ”เธเธฒเธฃเธ•เธณเนเธซเธเนเธเนเธ•เนเธฐ
          </CardTitle>
          <div className="flex gap-2">
            <Switch checked={isEditMode} onCheckedChange={setIsEditMode} id="edit-mode" />
            <Label htmlFor="edit-mode" className="text-sm">
              เนเธซเธกเธ”เนเธเนเนเธ
            </Label>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEditMode ? "เธเธฅเธดเธเนเธเธเนเธญเธเธงเนเธฒเธเน€เธเธทเนเธญเน€เธเธดเนเธกเนเธ•เนเธฐ เธซเธฃเธทเธญเธฅเธฒเธเนเธ•เนเธฐเน€เธเธทเนเธญเธขเนเธฒเธขเธ•เธณเนเธซเธเนเธ" : "เน€เธเธดเธ”เนเธซเธกเธ”เนเธเนเนเธเน€เธเธทเนเธญเธเธฑเธ”เธเธฒเธฃเธ•เธณเนเธซเธเนเธเนเธ•เนเธฐ"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Label>เน€เธฅเธทเธญเธเนเธเธ:</Label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zoneConfigs.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant={activeZone?.isActive ? "default" : "secondary"}>
              {activeZone?.isActive ? "เน€เธเธดเธ”เนเธเนเธเธฒเธ" : "เธเธดเธ”เนเธเนเธเธฒเธ"}
            </Badge>
          </div>

          {isEditMode && (
            <div className="flex gap-2">
              {/* เน€เธเธดเนเธกเธเธธเนเธกเธเธฃเธฑเธเธเธเธฒเธ” Grid */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGridSizeDialog(true)}
                className="flex items-center gap-1"
              >
                <Grid className="h-4 w-4 mr-1" />
                เธเธฃเธฑเธเธเธเธฒเธ” Grid ({gridSize.rows}x{gridSize.cols})
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    เธฃเธตเน€เธเนเธ•
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>เธฃเธตเน€เธเนเธ•เน€เธฅเธขเนเน€เธญเธฒเธ•เน</AlertDialogTitle>
                    <AlertDialogDescription>
                      เธเธธเธ“เนเธเนเนเธเธซเธฃเธทเธญเนเธกเนเธ—เธตเนเธเธฐเธฃเธตเน€เธเนเธ•เธ•เธณเนเธซเธเนเธเนเธ•เนเธฐเนเธเนเธเธ {selectedZone} เน€เธเนเธเธเนเธฒเน€เธฃเธดเนเธกเธ•เนเธ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>เธขเธเน€เธฅเธดเธ</AlertDialogCancel>
                    <AlertDialogAction onClick={resetLayout}>เธฃเธตเน€เธเนเธ•</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Dialog เธชเธณเธซเธฃเธฑเธเธเธฃเธฑเธเธเธเธฒเธ” Grid */}
        <AlertDialog open={showGridSizeDialog} onOpenChange={setShowGridSizeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>เธเธฃเธฑเธเธเธเธฒเธ” Grid</AlertDialogTitle>
              <AlertDialogDescription>เธเธณเธซเธเธ”เธเธณเธเธงเธเนเธ–เธงเนเธฅเธฐเธเธญเธฅเธฑเธกเธเนเธเธญเธ Grid</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="grid-rows">เธเธณเธเธงเธเนเธ–เธง</Label>
                <Input
                  id="grid-rows"
                  type="number"
                  min="5"
                  max="20"
                  value={newGridSize.rows}
                  onChange={(e) =>
                    setNewGridSize((prev) => ({ ...prev, rows: Number.parseInt(e.target.value) || 5 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grid-cols">เธเธณเธเธงเธเธเธญเธฅเธฑเธกเธเน</Label>
                <Input
                  id="grid-cols"
                  type="number"
                  min="5"
                  max="20"
                  value={newGridSize.cols}
                  onChange={(e) =>
                    setNewGridSize((prev) => ({ ...prev, cols: Number.parseInt(e.target.value) || 5 }))
                  }
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>เธขเธเน€เธฅเธดเธ</AlertDialogCancel>
              <AlertDialogAction onClick={handleResizeGrid}>เธเธฑเธเธ—เธถเธ</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Grid Layout */}
        <div className={cn("relative border-2 rounded-lg p-4", getZoneColor(selectedZone))}>
          <div
            className="grid gap-1 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${gridSize.cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${gridSize.rows}, ${cellSize}px)`,
              width: `${gridSize.cols * (cellSize + 4)}px`,
              height: `${gridSize.rows * (cellSize + 4)}px`,
            }}
          >
            {Array.from({ length: gridSize.rows * gridSize.cols }, (_, index) => {
              const x = index % gridSize.cols
              const y = Math.floor(index / gridSize.cols)
              const table = getTableAtPosition(x, y)

              return (
                <div
                  key={`${x}-${y}`}
                  className={cn(
                    "border border-gray-200 rounded flex items-center justify-center text-xs transition-all",
                    isEditMode ? "cursor-pointer hover:bg-gray-100" : "",
                    table ? "relative" : "bg-gray-50",
                  )}
                  onClick={() => handleCellClick(x, y)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleTableDrop(x, y)}
                >
                  {table ? (
                    <div
                      className={cn(
                        "w-full h-full rounded-full flex flex-col items-center justify-center text-xs font-medium border-2 transition-all",
                        getTableColor(table),
                        isEditMode ? "cursor-move hover:scale-105" : "",
                        !table.isActive && "opacity-50",
                      )}
                      draggable={isEditMode}
                      onDragStart={() => handleTableDragStart(table)}
                      title={`${table.name} (${x}, ${y})`}
                    >
                      <span className="font-bold">{table.name}</span>
                      <span className="text-xs opacity-75">9 เธ—เธตเนเธเธฑเนเธ</span>

                      {isEditMode && (
                        <div className="absolute -top-2 -right-2 flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 bg-white"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTableActive(table.id)
                            }}
                          >
                            {table.isActive ? "๐”ต" : "โซ"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0 bg-red-50 hover:bg-red-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>เธฅเธเนเธ•เนเธฐ</AlertDialogTitle>
                                <AlertDialogDescription>
                                  เธเธธเธ“เนเธเนเนเธเธซเธฃเธทเธญเนเธกเนเธ—เธตเนเธเธฐเธฅเธ{table.name}? เธเธฒเธฃเธ”เธณเน€เธเธดเธเธเธฒเธฃเธเธตเนเนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธขเนเธญเธเธเธฅเธฑเธเนเธ”เน
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>เธขเธเน€เธฅเธดเธ</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveTable(table.id)}>เธฅเธ</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ) : (
                    isEditMode && (
                      <div className="text-gray-400 hover:text-gray-600">
                        <Plus className="h-4 w-4" />
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* เธชเธ–เธดเธ•เธดเนเธเธ */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{zoneTables.length}</p>
              <p className="text-sm text-muted-foreground">เธเธณเธเธงเธเนเธ•เนเธฐเธ—เธฑเนเธเธซเธกเธ”</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{zoneTables.filter((t) => t.isActive).length}</p>
              <p className="text-sm text-muted-foreground">เนเธ•เนเธฐเธ—เธตเนเน€เธเธดเธ”เนเธเนเธเธฒเธ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{zoneTables.filter((t) => t.isActive).length * 9}</p>
              <p className="text-sm text-muted-foreground">เธ—เธตเนเธเธฑเนเธเธ—เธฑเนเธเธซเธกเธ”</p>
            </CardContent>
          </Card>
        </div>

        {/* เธเธณเนเธเธฐเธเธณ */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">เธเธณเนเธเธฐเธเธณเธเธฒเธฃเนเธเนเธเธฒเธ:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>โ€ข เน€เธเธดเธ” &quot;เนเธซเธกเธ”เนเธเนเนเธ&quot; เน€เธเธทเนเธญเธเธฑเธ”เธเธฒเธฃเธ•เธณเนเธซเธเนเธเนเธ•เนเธฐ</li>
            <li>โ€ข เธเธฅเธดเธเนเธเธเนเธญเธเธงเนเธฒเธ (เธชเธตเน€เธ—เธฒ) เน€เธเธทเนเธญเน€เธเธดเนเธกเนเธ•เนเธฐเนเธซเธกเน</li>
            <li>โ€ข เธฅเธฒเธเนเธ•เนเธฐเน€เธเธทเนเธญเธขเนเธฒเธขเธ•เธณเนเธซเธเนเธ</li>
            <li>โ€ข เธเธฅเธดเธเธเธธเนเธกเธชเธตเธเนเธณเน€เธเธดเธ/เธ”เธณ เน€เธเธทเนเธญเน€เธเธดเธ”/เธเธดเธ”เธเธฒเธฃเนเธเนเธเธฒเธเนเธ•เนเธฐ</li>
            <li>โ€ข เธเธฅเธดเธเธเธธเนเธกเธ–เธฑเธเธเธขเธฐเน€เธเธทเนเธญเธฅเธเนเธ•เนเธฐ</li>
            <li>โ€ข เธเธฅเธดเธเธเธธเนเธก &quot;เธเธฃเธฑเธเธเธเธฒเธ” Grid&quot; เน€เธเธทเนเธญเธเธณเธซเธเธ”เธเธณเธเธงเธเนเธ–เธงเนเธฅเธฐเธเธญเธฅเธฑเธกเธเน</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
)
}
