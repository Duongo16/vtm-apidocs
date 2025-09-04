"use client"

import type React from "react"
import { createContext, useContext, useState, type ReactNode } from "react"
import { Snackbar, Alert, type AlertColor, Slide, type SlideProps } from "@mui/material"

interface ToastContextType {
  showToast: (message: string, severity?: AlertColor) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState("")
    const [severity, setSeverity] = useState<AlertColor>("success")

    const showToast = (message: string, severity: AlertColor = "success") => {
        setMessage(message)
        setSeverity(severity)
        setOpen(true)
    }

    const showSuccess = (message: string) => showToast(message, "success")
    const showError = (message: string) => showToast(message, "error")
    const showWarning = (message: string) => showToast(message, "warning")
    const showInfo = (message: string) => showToast(message, "info")

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === "clickaway") {
            return
        }
        setOpen(false)
    }

    const value = {
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    }

    return (
        <ToastContext.Provider value={value}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={handleClose}
                TransitionComponent={SlideTransition}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                sx={{ zIndex: 9999, top: "80px !important" }}
            >
                <Alert
                    onClose={handleClose}
                    severity={severity}
                    variant="filled"
                    sx={{
                        width: "100%",
                        borderRadius: 2,
                        fontWeight: "medium",
                        boxShadow: 3,
                    }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    )
}
