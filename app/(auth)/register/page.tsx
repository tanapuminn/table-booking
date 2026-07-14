"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

const formSchema = z
  .object({
    phone: z
      .string()
      .regex(/^0\d{9}$/, { message: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0" }),
    email: z.string().email({ message: "กรุณากรอกอีเมลให้ถูกต้อง" }),
    fullname: z.string().min(2, { message: "กรุณากรอกชื่อ-นามสกุล" }),
    password: z.string().min(6, { message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }),
    confirmPassword: z.string().min(1, { message: "กรุณายืนยันรหัสผ่าน" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  })

type PendingGoogleProfile = {
  email?: string
  fullname?: string
  avatarUrl?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const { register, googleLogin } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [consented, setConsented] = useState(false)
  const [googleCredential, setGoogleCredential] = useState<string | null>(null)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: "", email: "", fullname: "", password: "", confirmPassword: "" },
  })

  useEffect(() => {
    const pendingCredential = sessionStorage.getItem("pending_google_credential")
    const pendingProfileRaw = sessionStorage.getItem("pending_google_profile")

    if (!pendingCredential) return

    setGoogleCredential(pendingCredential)

    try {
      const profile = JSON.parse(pendingProfileRaw || "{}") as PendingGoogleProfile
      if (profile.email) {
        form.setValue("email", profile.email, { shouldValidate: true })
        setGoogleEmail(profile.email)
      }
      if (profile.fullname) {
        form.setValue("fullname", profile.fullname, { shouldValidate: true })
      }
    } catch {
      // Ignore malformed cached profile data. The backend still validates the credential on submit.
    }
  }, [form])

  const completeRegistration = useCallback(() => {
    sessionStorage.removeItem("pending_google_credential")
    sessionStorage.removeItem("pending_google_profile")
    router.push("/")
    router.refresh()
  }, [router])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      await register(values.phone, values.email, values.password, values.fullname, googleCredential || undefined)
      toast({
        title: "สมัครสมาชิกสำเร็จ",
        description: googleCredential ? "บัญชี Google ถูกผูกเข้ากับบัญชีนี้แล้ว" : "ยินดีต้อนรับ!",
      })
      completeRegistration()
    } catch (error: any) {
      const message = error?.response?.data?.message || "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่"
      toast({ title: "สมัครสมาชิกไม่สำเร็จ", description: message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      const { user } = await googleLogin(credential)
      toast({ title: "เข้าสู่ระบบด้วย Google สำเร็จ" })
      router.push(user.profileCompleted ? (user.role === "admin" ? "/psmnlp-dashboard" : "/") : "/profile/complete")
      router.refresh()
    } catch (error: any) {
      const data = error?.response?.data
      const message = data?.message || "ไม่สามารถเชื่อมต่อ Google ได้"
      toast({ title: "Google sign-in ไม่สำเร็จ", description: message, variant: "destructive" })
    }
  }, [googleLogin, router, toast])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">สมัครสมาชิก</CardTitle>
          <CardDescription className="text-center">
            ระบบจองโต๊ะจีน งานร้อยดวงใจ ครั้งที่ 21
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {googleCredential && googleEmail ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              จะผูกบัญชี Google: {googleEmail}
            </div>
          ) : (
            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isLoading} text="signup_with" />
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>กรอกข้อมูลสมาชิก</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทร</FormLabel>
                    <FormControl>
                      <Input placeholder="0xxxxxxxxx" inputMode="numeric" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@email.com" inputMode="email" readOnly={Boolean(googleCredential)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล</FormLabel>
                    <FormControl>
                      <Input placeholder="กรอกชื่อ-นามสกุล" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสผ่าน</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
                    <FormLabel>ยืนยันรหัสผ่าน</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <label className="flex cursor-pointer select-none items-start gap-3">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-sm leading-snug text-muted-foreground">
                  ฉันยินยอมให้เก็บรวบรวมและใช้ข้อมูลส่วนบุคคล (เบอร์โทร, อีเมล, ชื่อ) เพื่อใช้ในระบบจองโต๊ะจีนงานร้อยดวงใจ ครั้งที่ 21
                </span>
              </label>

              <Button type="submit" className="w-full" disabled={isLoading || !consented}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังสมัครสมาชิก...
                  </>
                ) : googleCredential ? (
                  "สมัครและผูกบัญชี Google"
                ) : (
                  "สมัครสมาชิก"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          <div className="w-full text-muted-foreground">
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              เข้าสู่ระบบ
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}