"use client"

import { useState } from "react"
import Link from "next/link"
import axios from "axios"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { apiBaseUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  email: z.string().trim().email({ message: "กรุณากรอกอีเมลให้ถูกต้อง" }),
})

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      await axios.post(`${apiBaseUrl}/api/auth/forgot-password`, { email: values.email.trim().toLowerCase() })
      setIsSubmitted(true)
    } catch {
      toast({
        title: "ส่งลิงก์ไม่สำเร็จ",
        description: "ไม่สามารถส่งอีเมลได้ในขณะนี้ กรุณาลองอีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {isSubmitted ? "ตรวจสอบอีเมลของคุณ" : "ตั้งรหัสผ่านใหม่"}
          </CardTitle>
          <CardDescription>ระบบจองโต๊ะจีน งานร้อยดวงใจ ครั้งที่ 21</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isSubmitted ? <CheckCircle2 className="h-8 w-8" aria-hidden="true" /> : <Mail className="h-8 w-8" aria-hidden="true" />}
            </div>
          </div>

          {isSubmitted ? (
            <div className="space-y-5 text-center">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>หากอีเมลนี้มีบัญชีอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้แล้ว</p>
                <p>กรุณาตรวจสอบกล่องจดหมายและโฟลเดอร์จดหมายขยะ</p>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>
                ส่งไปยังอีเมลอีกครั้ง
              </Button>
            </div>
          ) : (
            <>
              <p className="text-center text-sm leading-6 text-muted-foreground">
                กรอกอีเมลที่ใช้สมัครสมาชิก<br />ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ทางอีเมล
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" inputMode="email" autoComplete="email" placeholder="example@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        กำลังส่งลิงก์...
                      </>
                    ) : (
                      "ส่งลิงก์ไปที่อีเมล"
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-muted-foreground">ลิงก์จะมีอายุ 15 นาที</p>
            </>
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
