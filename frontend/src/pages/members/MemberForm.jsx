import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import api, { apiError } from "../../lib/api";
import { toast } from "react-toastify";
import { Button, Card, Input, Select, PageHeader, Spinner } from "../../components/ui";

export default function MemberForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { membershipType: "ASSOCIATE" },
  });

  useEffect(() => {
    api.get("/barangays").then((res) => setBarangays(res.data));
    if (isEdit) {
      api
        .get(`/members/${id}`)
        .then((res) => {
          const m = res.data;
          reset({
            memberNo: m.memberNo,
            firstName: m.firstName,
            middleName: m.middleName ?? "",
            lastName: m.lastName,
            sex: m.sex ?? "",
            birthdate: m.birthdate ? m.birthdate.slice(0, 10) : "",
            address: m.address ?? "",
            barangayId: m.barangayId ?? "",
            contactNo: m.contactNo ?? "",
            membershipType: m.membershipType,
            dateJoined: m.dateJoined ? m.dateJoined.slice(0, 10) : "",
          });
        })
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(values) {
    setError("");
    // Normalize types for the API.
    const payload = {
      ...values,
      barangayId: values.barangayId ? Number(values.barangayId) : null,
      middleName: values.middleName || null,
      birthdate: values.birthdate || null,
    };
    try {
      if (isEdit) {
        await api.put(`/members/${id}`, payload);
        toast.success("Member updated");
        navigate(`/members/${id}`);
      } else {
        const res = await api.post("/members", payload);
        toast.success("Member created");
        navigate(`/members/${res.data.id}`);
      }
    } catch (err) {
      setError(apiError(err));
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader title={isEdit ? "Edit member" : "New member"} />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-[#FDEBEC] px-3 py-2 text-sm text-[#9F2F2D]">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Member No."
              {...register("memberNo", { required: "Required" })}
              error={errors.memberNo?.message}
            />
            <Select label="Membership type" {...register("membershipType")}>
              <option value="ASSOCIATE">Associate</option>
              <option value="REGULAR">Regular</option>
            </Select>
            <Input
              label="First name"
              {...register("firstName", { required: "Required" })}
              error={errors.firstName?.message}
            />
            <Input label="Middle name" {...register("middleName")} />
            <Input
              label="Last name"
              {...register("lastName", { required: "Required" })}
              error={errors.lastName?.message}
            />
            <Select label="Sex" {...register("sex")}>
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            <Input label="Birthdate" type="date" {...register("birthdate")} />
            <Input label="Contact no." {...register("contactNo")} />
            <Select label="Barangay" {...register("barangayId")}>
              <option value="">—</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Input label="Date joined" type="date" {...register("dateJoined")} />
          </div>
          <Input label="Address" {...register("address")} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save member"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
