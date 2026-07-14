"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Phone } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  phone: z
    .string()
    .regex(/^0\d{9}$/, { message: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0" }),
})

function CompleteProfileForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: user?.phone || "" },
  })

  useEffect(() => {
    if (!isLoading && user?.profileCompleted) {
      router.replace(searchParams.get("redirect") || "/")
    }
  }, [isLoading, router, searchParams, user?.profileCompleted])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      await updateProfile({ phone: values.phone })
      toast({ title: "บันทึกเบอร์โทรแล้ว" })
      router.push(searchParams.get("redirect") || "/")
      router.refresh()
    } catch (error: any) {
      const message = error?.response?.data?.message || "ไม่สามารถบันทึกเบอร์โทรได้ กรุณาลองใหม่"
      toast({ title: "บันทึกข้อมูลไม่สำเร็จ", description: message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Phone className="h-5 w-5" />
          </div>
          <CardTitle className="text-center text-2xl font-bold">เพิ่มเบอร์โทรศัพท์</CardTitle>
          <CardDescription className="text-center">
            ใช้สำหรับยืนยันการจองและค้นหาประวัติการจองของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกและเริ่มใช้งาน"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense>
      <CompleteProfileForm />
    </Suspense>
  )
}