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

  // เพิ่ม state สำหรับขนาด grid
  const [gridSize, setGridSize] = useState({ rows: 10, cols: 10 })
  const [newGridSize, setNewGridSize] = useState({ rows: 10, cols: 10 })
  const [showGridSizeDialog, setShowGridSizeDialog] = useState(false)

  const cellSize = 60

  // กรองโต๊ะตามโซนที่เลือก
  const zoneTables = tablePositions.filter((table) => table.zone === selectedZone)
  const activeZone = zoneConfigs.find((zone) => zone.id === selectedZone)

  // โหลดขนาด grid จาก localStorage เมื่อ component mount
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

  // บันทึกขนาด grid ลง localStorage เมื่อมีการเปลี่ยนแปลง
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
        title: "ตำแหน่งนี้มีโต๊ะแล้ว",
        description: "กรุณาเลือกตำแหน่งอื่น หรือลบโต๊ะเดิมก่อน",
        variant: "destructive",
      })
      return
    }

    try {
    await addTable(selectedZone, x, y);
    toast({
      title: "เพิ่มโต๊ะสำเร็จ",
      description: `เพิ่มโต๊ะในโซน ${selectedZone} ที่ตำแหน่ง (${x}, ${y})`,
    });
  } catch (error) {
    toast({
      title: "เกิดข้อผิดพลาด",
      description: (error instanceof Error ? error.message : "ไม่สามารถเพิ่มโต๊ะได้"),
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

  // ตรวจสอบว่าตำแหน่งใหม่ว่างหรือไม่
  const existingTable = zoneTables.find((table) => table.x === x && table.y === y && table.id !== draggedTable.id)

  if (existingTable) {
    toast({
      title: "ไม่สามารถย้ายได้",
      description: "ตำแหน่งนี้มีโต๊ะอื่นอยู่แล้ว",
      variant: "destructive",
    })
    setDraggedTable(null)
    return
  }

  updateTablePosition(draggedTable.id, x, y)
  toast({
    title: "ย้ายโต๊ะสำเร็จ",
    description: `ย้าย${draggedTable.name} ไปยังตำแหน่ง (${x}, ${y})`,
  })
  setDraggedTable(null)
}

const handleRemoveTable = (tableId: number) => {
  removeTable(tableId)
  toast({
    title: "ลบโต๊ะสำเร็จ",
    description: "ลบโต๊ะออกจากระบบเรียบร้อยแล้ว",
  })
}

const resetLayout = () => {
  // รีเซ็ตเป็นตำแหน่งเริ่มต้น
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
    title: "รีเซ็ตเลย์เอาต์สำเร็จ",
    description: `รีเซ็ตตำแหน่งโต๊ะในโซน ${selectedZone} เป็นค่าเริ่มต้น`,
  })
}

// เพิ่มฟังก์ชันสำหรับปรับขนาด grid
const handleResizeGrid = () => {
  // ตรวจสอบว่ามีโต๊ะที่อยู่นอกขอบเขตใหม่หรือไม่
  const tablesOutOfBounds = zoneTables.filter((table) => table.x >= newGridSize.cols || table.y >= newGridSize.rows)

  if (tablesOutOfBounds.length > 0) {
    toast({
      title: "ไม่สามารถปรับขนาดได้",
      description: `มีโต๊ะ ${tablesOutOfBounds.length} โต๊ะที่จะอยู่นอกขอบเขตใหม่ กรุณาย้ายโต๊ะก่อน`,
      variant: "destructive",
    })
    return
  }

  setGridSize(newGridSize)
  setShowGridSizeDialog(false)

  toast({
    title: "ปรับขนาด Grid สำเร็จ",
    description: `ปรับขนาด Grid เป็น ${newGridSize.rows} แถว x ${newGridSize.cols} คอลัมน์`,
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
        <div className="flex flex-wrap justify-between items-center gap-4">
          <CardTitle className="flex min-w-0 items-center gap-2">
            <Move className="h-5 w-5" />
            จัดการตำแหน่งโต๊ะ
          </CardTitle>
          <div className="flex gap-2">
            <Switch checked={isEditMode} onCheckedChange={setIsEditMode} id="edit-mode" />
            <Label htmlFor="edit-mode" className="text-sm">
              โหมดแก้ไข
            </Label>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {isEditMode ? "คลิกในช่องว่างเพื่อเพิ่มโต๊ะ หรือลากโต๊ะเพื่อย้ายตำแหน่ง" : "เปิดโหมดแก้ไขเพื่อจัดการตำแหน่งโต๊ะ"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Label>เลือกโซน:</Label>
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
              {activeZone?.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
            </Badge>
          </div>

          {isEditMode && (
            <div className="flex gap-2">
              {/* เพิ่มปุ่มปรับขนาด Grid */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGridSizeDialog(true)}
                className="flex items-center gap-1"
              >
                <Grid className="h-4 w-4 mr-1" />
                ปรับขนาด Grid ({gridSize.rows}x{gridSize.cols})
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    รีเซ็ต
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>รีเซ็ตเลย์เอาต์</AlertDialogTitle>
                    <AlertDialogDescription>
                      คุณแน่ใจหรือไม่ที่จะรีเซ็ตตำแหน่งโต๊ะในโซน {selectedZone} เป็นค่าเริ่มต้น?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction onClick={resetLayout}>รีเซ็ต</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Dialog สำหรับปรับขนาด Grid */}
        <AlertDialog open={showGridSizeDialog} onOpenChange={setShowGridSizeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ปรับขนาด Grid</AlertDialogTitle>
              <AlertDialogDescription>กำหนดจำนวนแถวและคอลัมน์ของ Grid</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="grid-rows">จำนวนแถว</Label>
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
                <Label htmlFor="grid-cols">จำนวนคอลัมน์</Label>
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
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={handleResizeGrid}>บันทึก</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Grid Layout */}
        <div className={cn("relative overflow-x-auto border-2 rounded-lg p-4", getZoneColor(selectedZone))}>
          <div
            className="grid gap-1 mx-auto min-w-max"
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
                        "relative w-full h-full rounded-full flex flex-col items-center justify-center text-xs leading-tight font-medium border-2 transition-all",
                        getTableColor(table),
                        isEditMode ? "cursor-move hover:scale-105" : "",
                        !table.isActive && "opacity-50",
                      )}
                      draggable={isEditMode}
                      onDragStart={() => handleTableDragStart(table)}
                      title={`${table.name} (${x}, ${y})`}
                    >
                      <span className="font-bold">{table.name}</span>
                      <span className="text-xs opacity-75">9 ที่นั่ง</span>

                      {isEditMode && (
                        <div className="absolute top-0 right-0 z-20 flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 bg-white shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTableActive(table.id)
                            }}
                          >
                            {table.isActive ? "🔵" : "⚫"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 bg-red-50 hover:bg-red-100 shadow-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ลบโต๊ะ</AlertDialogTitle>
                                <AlertDialogDescription>
                                  คุณแน่ใจหรือไม่ที่จะลบ{table.name}? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveTable(table.id)}>ลบ</AlertDialogAction>
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

        {/* สถิติโซน */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{zoneTables.length}</p>
              <p className="text-sm text-muted-foreground">จำนวนโต๊ะทั้งหมด</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{zoneTables.filter((t) => t.isActive).length}</p>
              <p className="text-sm text-muted-foreground">โต๊ะที่เปิดใช้งาน</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{zoneTables.filter((t) => t.isActive).length * 9}</p>
              <p className="text-sm text-muted-foreground">ที่นั่งทั้งหมด</p>
            </CardContent>
          </Card>
        </div>

        {/* คำแนะนำ */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">คำแนะนำการใช้งาน:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• เปิด &quot;โหมดแก้ไข&quot; เพื่อจัดการตำแหน่งโต๊ะ</li>
            <li>• คลิกในช่องว่าง (สีเทา) เพื่อเพิ่มโต๊ะใหม่</li>
            <li>• ลากโต๊ะเพื่อย้ายตำแหน่ง</li>
            <li>• คลิกปุ่มสีน้ำเงิน/ดำ เพื่อเปิด/ปิดการใช้งานโต๊ะ</li>
            <li>• คลิกปุ่มถังขยะเพื่อลบโต๊ะ</li>
            <li>• คลิกปุ่ม &quot;ปรับขนาด Grid&quot; เพื่อกำหนดจำนวนแถวและคอลัมน์</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
)
}
