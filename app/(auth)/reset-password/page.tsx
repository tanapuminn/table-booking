"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { apiBaseUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { PasswordInput } from "@/components/password-input"
import { useToast } from "@/hooks/use-toast"

const formSchema = z
  .object({
    password: z.string().min(6, { message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  })

type Status = "form" | "done" | "invalid"

function ResetPasswordContent() {
  const { toast } = useToast()
  const token = useSearchParams().get("token") || ""
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<Status>(token ? "form" : "invalid")

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      await axios.post(`${apiBaseUrl}/api/auth/reset-password`, { token, password: values.password })
      setStatus("done")
    } catch (error) {
      // 400 = ลิงก์ผิด หมดอายุ หรือใช้ไปแล้ว ส่วน error อื่นให้ลองใหม่ได้โดยไม่เสียลิงก์
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setStatus("invalid")
      } else {
        toast({ title: "ตั้งรหัสผ่านไม่สำเร็จ", description: "กรุณาลองอีกครั้ง", variant: "destructive" })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const heading = { form: "ตั้งรหัสผ่านใหม่", done: "ตั้งรหัสผ่านใหม่แล้ว", invalid: "ลิงก์ใช้ไม่ได้" }[status]
  const Icon = { form: KeyRound, done: CheckCircle2, invalid: TriangleAlert }[status]

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{heading}</CardTitle>
          <CardDescription>ระบบจองโต๊ะจีน งานร้อยดวงใจ ครั้งที่ 21</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex justify-center">
            <div className={status === "invalid"
              ? "flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700"
              : "flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"}>
              <Icon className="h-8 w-8" aria-hidden="true" />
            </div>
          </div>

          {status === "done" && (
            <div className="space-y-5 text-center">
              <p className="text-sm text-muted-foreground">ใช้รหัสผ่านใหม่เข้าสู่ระบบได้เลย อุปกรณ์อื่นที่เคยเข้าสู่ระบบไว้จะต้องเข้าสู่ระบบใหม่</p>
              <Button asChild className="w-full">
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-5 text-center">
              <p className="text-sm text-muted-foreground">ลิงก์นี้ไม่ถูกต้อง หมดอายุแล้ว หรือถูกใช้ไปแล้ว ขอลิงก์ใหม่ได้ที่หน้าลืมรหัสผ่าน</p>
              <Button asChild className="w-full">
                <Link href="/forgot-password">ขอลิงก์ใหม่</Link>
              </Button>
            </div>
          )}

          {status === "form" && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>รหัสผ่านใหม่</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ยืนยันรหัสผ่านใหม่</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    "บันทึกรหัสผ่านใหม่"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>

        <CardFooter className="justify-center text-sm text-muted-foreground">
          กลับไปหน้า&nbsp;
          <Link href="/login" className="font-medium text-primary hover:underline">
            เข้าสู่ระบบ
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
