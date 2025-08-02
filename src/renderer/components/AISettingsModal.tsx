import React, { useState, useEffect, useCallback } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

interface AICredentials {
  provider: "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  resourceName?: string;
}

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentials: AICredentials) => void;
}

const defaultModels = {
  openai: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "o4-mini"],
  anthropic: [
    "claude-3-7-sonnet",
    "claude-3-7-haiku",
    "claude-3-7-opus",
    "claude-4-haiku",
    "claude-4-sonnet",
    "claude-4-opus",
  ],
  azure: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "o4-mini"],
  bedrock: [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
  ],
  ollama: ["llama3.2", "llama3.1", "codellama", "mistral"],
};

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [credentials, setCredentials] = useState<AICredentials>({
    provider: "openai",
    model: "gpt-4.1-mini",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadExistingCredentials();
    }
  }, [isOpen]);

  const loadExistingCredentials = async () => {
    try {
      const credentialsStr = await window.electronAPI.ai.getCredentials(
        credentials.provider,
      );
      if (credentialsStr) {
        const existingCredentials = JSON.parse(credentialsStr);
        setCredentials((prev) => ({ ...prev, ...existingCredentials }));
      }
    } catch (error) {
      console.error("Failed to load existing credentials:", error);
    }
  };

  const handleProviderChange = useCallback(
    async (provider: AICredentials["provider"]) => {
      setCredentials((prev) => ({
        provider,
        model: defaultModels[provider][0],
        // Reset provider-specific fields
        apiKey: "",
        baseUrl: "",
        region: "",
        accessKeyId: "",
        secretAccessKey: "",
        resourceName: "",
      }));

      // Load existing credentials for the new provider
      try {
        const credentialsStr =
          await window.electronAPI.ai.getCredentials(provider);
        if (credentialsStr) {
          const existingCredentials = JSON.parse(credentialsStr);
          setCredentials((prev) => ({
            ...prev,
            ...existingCredentials,
            provider,
          }));
        }
      } catch (error) {
        console.error("Failed to load credentials for provider:", error);
      }
    },
    [],
  );

  const validateCredentials = async () => {
    setIsValidating(true);
    setError("");

    try {
      const isValid =
        await window.electronAPI.ai.validateCredentials(credentials);
      if (!isValid) {
        setError("Invalid credentials. Please check your configuration.");
        return false;
      }
      return true;
    } catch (error: any) {
      setError(error.message || "Failed to validate credentials");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setError("");

    // Basic validation
    if (!credentials.provider) {
      setError("Please select a provider");
      return;
    }

    if (credentials.provider !== "ollama" && !credentials.apiKey) {
      setError("API key is required");
      return;
    }

    setIsLoading(true);

    try {
      // Validate credentials first
      const isValid = await validateCredentials();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      // Save to keychain
      await window.electronAPI.ai.setCredentials(
        credentials.provider,
        JSON.stringify(credentials),
      );

      onSave(credentials);
      onClose();
    } catch (error: any) {
      setError(error.message || "Failed to save credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const renderProviderFields = () => {
    const isDisabled = isLoading || isValidating;

    switch (credentials.provider) {
      case "openai":
        return (
          <>
            <div className="form-group">
              <label htmlFor="apiKey">API Key *</label>
              <input
                type="password"
                id="apiKey"
                value={credentials.apiKey || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                placeholder="sk-..."
                disabled={isDisabled}
                required
                data-testid="ai-api-key-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="baseUrl">Base URL (optional)</label>
              <input
                type="url"
                id="baseUrl"
                value={credentials.baseUrl || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    baseUrl: e.target.value,
                  }))
                }
                placeholder="https://api.openai.com/v1"
                disabled={isDisabled}
              />
            </div>
          </>
        );

      case "anthropic":
        return (
          <>
            <div className="form-group">
              <label htmlFor="apiKey">API Key *</label>
              <input
                type="password"
                id="apiKey"
                value={credentials.apiKey || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                placeholder="sk-ant-..."
                disabled={isDisabled}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="baseUrl">Base URL (optional)</label>
              <input
                type="url"
                id="baseUrl"
                value={credentials.baseUrl || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    baseUrl: e.target.value,
                  }))
                }
                placeholder="https://api.anthropic.com"
                disabled={isDisabled}
              />
            </div>
          </>
        );

      case "azure":
        return (
          <>
            <div className="form-group">
              <label htmlFor="apiKey">API Key *</label>
              <input
                type="password"
                id="apiKey"
                value={credentials.apiKey || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                disabled={isDisabled}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="resourceName">Resource Name *</label>
              <input
                type="text"
                id="resourceName"
                value={credentials.resourceName || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    resourceName: e.target.value,
                  }))
                }
                placeholder="my-azure-resource"
                disabled={isDisabled}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="baseUrl">Base URL (optional)</label>
              <input
                type="url"
                id="baseUrl"
                value={credentials.baseUrl || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    baseUrl: e.target.value,
                  }))
                }
                placeholder="https://my-resource.openai.azure.com"
                disabled={isDisabled}
              />
            </div>
          </>
        );

      case "bedrock":
        return (
          <>
            <div className="form-group">
              <label htmlFor="accessKeyId">Access Key ID *</label>
              <input
                type="password"
                id="accessKeyId"
                value={credentials.accessKeyId || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    accessKeyId: e.target.value,
                  }))
                }
                placeholder="AKIA..."
                disabled={isDisabled}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="secretAccessKey">Secret Access Key *</label>
              <input
                type="password"
                id="secretAccessKey"
                value={credentials.secretAccessKey || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    secretAccessKey: e.target.value,
                  }))
                }
                disabled={isDisabled}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="region">Region</label>
              <input
                type="text"
                id="region"
                value={credentials.region || "us-east-1"}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    region: e.target.value,
                  }))
                }
                placeholder="us-east-1"
                disabled={isDisabled}
              />
            </div>
          </>
        );

      case "ollama":
        return (
          <div className="form-group">
            <label htmlFor="baseUrl">Base URL</label>
            <input
              type="url"
              id="baseUrl"
              value={credentials.baseUrl || "http://localhost:11434"}
              onChange={(e) =>
                setCredentials((prev) => ({ ...prev, baseUrl: e.target.value }))
              }
              placeholder="http://localhost:11434"
              disabled={isDisabled}
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="connection-modal-overlay" onClick={onClose} data-testid="ai-settings-modal-overlay">
      <div className="connection-modal" onClick={(e) => e.stopPropagation()} data-testid="ai-settings-modal">
        <div className="connection-modal-header">
          <h2>AI Settings</h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div className="connection-modal-body">
            {error && <div className="error-message" data-testid="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="provider">AI Provider *</label>
              <select
                id="provider"
                value={credentials.provider}
                onChange={(e) =>
                  handleProviderChange(
                    e.target.value as AICredentials["provider"],
                  )
                }
                disabled={isLoading || isValidating}
                data-testid="ai-provider-select"
              >
                <option value="openai" data-testid="ai-provider-option">OpenAI</option>
                <option value="anthropic" data-testid="ai-provider-option">Anthropic</option>
                <option value="azure" data-testid="ai-provider-option">Azure OpenAI</option>
                <option value="bedrock" data-testid="ai-provider-option">Amazon Bedrock</option>
                <option value="ollama" data-testid="ai-provider-option">Ollama (Local)</option>
              </select>
            </div>

            {renderProviderFields()}

            <div className="form-group">
              <label htmlFor="model">
                Model
                <span style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-tertiary)', 
                  fontWeight: 'normal',
                  marginLeft: '8px'
                }}>
                  (or enter custom model name)
                </span>
              </label>
              <input
                type="text"
                id="model"
                list="model-suggestions"
                value={credentials.model || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, model: e.target.value }))
                }
                placeholder="Enter model name or select from suggestions..."
                disabled={isLoading || isValidating}
              />
              <datalist id="model-suggestions">
                {defaultModels[credentials.provider].map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>

            <div className="info-message">
              <strong>Note:</strong> When saving, credentials will be validated by generating a single token using the selected model to ensure they work correctly.
            </div>
          </div>

          <div className="connection-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading || isValidating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={validateCredentials}
              disabled={
                isLoading ||
                isValidating ||
                (!credentials.apiKey && credentials.provider !== "ollama")
              }
              data-testid="validate-credentials-btn"
            >
              {isValidating ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <LoadingSpinner size="small" />
                  Validating...
                </div>
              ) : (
                "Test Connection"
              )}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || isValidating}
            >
              {isLoading ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <LoadingSpinner size="small" />
                  Saving...
                </div>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
