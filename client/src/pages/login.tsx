import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Film, Lock, User, Building2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { showSuccessMessage, showErrorMessage, messages } from "@/lib/messages";
import type { Company } from "@shared/schema";
import productionBg from "@assets/stock_images/film_production_stud_a0473fe5.jpg";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  securityPin: z.string().min(4, "Security PIN must be at least 4 characters"),
  companyId: z.string().min(1, "Please select a company to continue"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [showPin, setShowPin] = useState(false);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      securityPin: "",
      companyId: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      try {
        const response = await apiRequest("POST", "/api/auth/login", {
          username: data.username,
          securityPin: data.securityPin,
          companyId: parseInt(data.companyId),
        });
        const jsonData = await response.json();
        return jsonData;
      } catch (error: any) {
        const message = error.message || "Login failed";
        const jsonMatch = message.match(/\d+:\s*(.+)/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            throw new Error(parsed.message || "Login failed");
          } catch {
            throw new Error(jsonMatch[1] || "Login failed");
          }
        }
        throw error;
      }
    },
    onSuccess: (data: any) => {
      if (!data.user) {
        throw new Error("Invalid response from server");
      }
      login(data.user, data.company || null);
      showSuccessMessage(messages.success.loggedIn(data.user.username));
      setLocation("/");
    },
    onError: (error: any) => {
      showErrorMessage({
        title: messages.error.login().title,
        description: error.message || messages.error.login().description,
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${productionBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/80" />
      
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <Card className="w-full max-w-md bg-background/95 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              {/* Left side: Day + Time */}
              <div className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("en-IN", { weekday: "long" })}, {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </div>
              
              {/* Right side: Date */}
              <div className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
            
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Film className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-semibold mt-4">PRISM</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Post-Production Management System
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Enter your username" 
                            className="pl-10" 
                            data-testid="input-username"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="securityPin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security PIN</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type={showPin ? "text" : "password"}
                            placeholder="Enter your PIN"
                            className="pl-10 pr-12"
                            data-testid="input-security-pin"
                            autoComplete="current-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 h-9"
                            onClick={() => setShowPin(!showPin)}
                            data-testid="button-toggle-pin-visibility"
                          >
                            {showPin ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                        <Select onValueChange={field.onChange} value={field.value} disabled={companies.length === 0}>
                          <FormControl>
                            <SelectTrigger data-testid="select-company" className="pl-10">
                              <SelectValue placeholder={companies.length === 0 ? "No companies available" : "Select a company"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                No companies found. Please contact administrator.
                              </div>
                            ) : (
                              companies.map((company) => (
                                <SelectItem 
                                  key={company.id} 
                                  value={company.id.toString()}
                                  data-testid={`select-company-${company.id}`}
                                >
                                  {company.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      {companies.length === 0 && (
                        <p className="text-xs text-muted-foreground">Database setup required. Please wait or contact support.</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            </Form>

          </CardContent>
        </Card>
      </div>

      <footer className="py-4 text-center text-xs text-white/70 relative z-10">
        PRISM Post-Production Management System
      </footer>
    </div>
  );
}
