"use client"

import { Suspense, useCallback, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

const formSchema = z.object({
  phone: z
    .string()
    .regex(/^0\d{9}$/, { message: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0" }),
  password: z.string().min(1, { message: "กรุณากรอกรหัสผ่าน" }),
})

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, googleLogin } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: "", password: "" },
  })

  const redirectAfterLogin = useCallback((user: { role: "user" | "admin"; profileCompleted?: boolean }) => {
    const redirect = searchParams.get("redirect")

    if (!user.profileCompleted) {
      const completeProfileUrl = redirect ? `/profile/complete?redirect=${encodeURIComponent(redirect)}` : "/profile/complete"
      router.push(completeProfileUrl)
    } else if (redirect) {
      router.push(redirect)
    } else {
      router.push(user.role === "admin" ? "/psmnlp-dashboard" : "/")
    }
    router.refresh()
  }, [router, searchParams])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const { user } = await login(values.phone, values.password)
      toast({ title: "เข้าสู่ระบบสำเร็จ" })
      redirectAfterLogin(user)
    } catch (error: any) {
      const message = error?.response?.data?.message || "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง"
      toast({ title: "เข้าสู่ระบบไม่สำเร็จ", description: message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      const { user } = await googleLogin(credential)
      toast({ title: "เข้าสู่ระบบด้วย Google สำเร็จ" })
      redirectAfterLogin(user)
    } catch (error: any) {
      const data = error?.response?.data
      const message = data?.message || "ไม่สามารถเข้าสู่ระบบด้วย Google ได้"
      toast({ title: "Google sign-in ไม่สำเร็จ", description: message, variant: "destructive" })
    }
  }, [googleLogin, redirectAfterLogin, toast])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">เข้าสู่ระบบ</CardTitle>
          <CardDescription className="text-center">
            ระบบจองโต๊ะจีน งานร้อยดวงใจ ครั้งที่ 21
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <GoogleSignInButton onCredential={handleGoogleCredential} disabled={isLoading} text="signin_with" />

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>หรือ</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทรศัพท์</FormLabel>
                    <FormControl>
                      <Input placeholder="0xxxxxxxxx" inputMode="numeric" maxLength={10} {...field} />
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          <div className="w-full text-muted-foreground">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              สมัครสมาชิก
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}